const express = require("express");
const path = require("path");
const fse = require("fs-extra");
const multiparty = require("multiparty");
const bodyParser = require("body-parser");

const app = express();

//设置跨域访问
app.all("*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "X-Requested-With,Content-Type");
  res.header("Content-Type", "application/json; charset=utf-8");
  next();
});

// 中间件
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const UPLOAD_DIR = path.resolve(__dirname, "./", "upload_dir"); // 大文件存储目录

const pipeStream = (path, writeStream) =>
  new Promise((resolve) => {
    const readStream = fse.createReadStream(path);
    readStream.on("end", () => {
      fse.unlinkSync(path);
      resolve();
    });
    readStream.pipe(writeStream);
  });

// 合并切片
const mergeFileChunk = async (filePath, filename, size) => {
  const chunkPaths = await fse.readdir(filePath); // Returns: <Promise> Fulfills with an array of the names of the files in the directory excluding '.' and '..'.
  // console.log("chunkPaths ", chunkPaths);
  // 根据切片下标进行排序
  // 否则直接读取目录的获得的顺序可能会错乱
  chunkPaths.sort((a, b) => a.split("-")[1] - b.split("-")[1]);

  await Promise.all(
    chunkPaths.map((chunkPath, index) =>
      pipeStream(
        path.resolve(filePath, chunkPath),
        // 指定位置创建可写流
        fse.createWriteStream(path.resolve(UPLOAD_DIR, filename), {
          start: index * size,
        })
      )
    )
  );
  fse.rmdirSync(filePath); // 合并后删除保存切片的目录
};

// 接口
app.post("/upload", async (req, res) => {
  const multipart = new multiparty.Form();

  multipart.parse(req, async (err, fields, files) => {
    if (err) {
      console.log(err);
      return;
    }
    const [chunk] = files.chunk;
    const [hash] = fields.hash;
    const [filename] = fields.filename;
    const chunkDir = path.resolve(UPLOAD_DIR, `${filename}.path`);

    // 切片目录不存在，创建切片目录
    if (!fse.existsSync(chunkDir)) {
      await fse.mkdirs(chunkDir);
    }
    await fse.move(chunk.path, `${chunkDir}/${hash}`);
    res.end("received file chunk");
  });
});

// 接口
app.post("/merge", async (req, res) => {
  // console.log(req.query, req.body);
  const { filename, size } = req.body;
  const filePath = path.resolve(UPLOAD_DIR, `${filename}.path`);
  await mergeFileChunk(filePath, filename, size);
  res.end(
    JSON.stringify({
      code: 0,
      message: "file merged success",
    })
  );
});

app.listen(3000, () => console.log("正在监听 3000 端口"));
