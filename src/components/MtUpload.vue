<template>
  <div>
    <input type="file" @change="handleFileChange" />
    <el-button @click="handleUpload">上传</el-button>
    <el-button @click="mergeRequest">合并</el-button>
  </div>
</template>
<script>
import axios from "axios";
const SIZE = 10 * 1024 * 1024; // 切片大小
export default {
  data() {
    return {
      container: { file: null },
      data: [],
    };
  },
  methods: {
    request() {},
    handleFileChange(e) {
      const [file] = e.target.files;
      // console.log("handleFileChange => ", file);
      if (!file) return;
      // Object.assign(this.$data, this.$options.data());
      this.container.file = file;
    },
    // 生成文件切片
    createFileChunk(file, size = SIZE) {
      const fileChunkList = [];
      let cur = 0;
      while (cur < file.size) {
        fileChunkList.push({ file: file.slice(cur, cur + size) });
        cur += size;
      }
      return fileChunkList;
    },
    // 上传切片
    async uploadChunks() {
      const requestList = this.data
        .map(({ chunk, hash }) => {
          const formData = new FormData();
          formData.append("chunk", chunk);
          formData.append("hash", hash);
          formData.append("filename", this.container.file.name);
          // console.log("form => ", formData); // 显示一个空字面量
          return { formData };
        })
        .map(async ({ formData }) =>
          axios({
            method: "post",
            url: "http://localhost:3000/upload",
            headers: {
              "Content-Type": "multipart/form-data",
            },
            data: formData,
          })
        );

      await Promise.all(requestList); // 并发切片
      // await this.mergeRequest(); // 合并切片
    },
    async handleUpload() {
      if (!this.container.file) return;
      const fileChunkList = this.createFileChunk(this.container.file);
      this.data = fileChunkList.map(({ file }, index) => ({
        chunk: file,
        hash: this.container.file.name + "-" + index, // 文件名 - 数组下标
      }));
      await this.uploadChunks();
    },
    async mergeRequest() {
      await axios.post(
        "http://localhost:3000/merge",
        {
          size: SIZE,
          filename: this.container.file.name,
          // filename: "asdfasdfcccc",
        },
        {
          params: {
            ID: 12345,
          },
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    },
  },
};
</script>
