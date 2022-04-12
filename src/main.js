import Vue from "vue";
import App from "./App.vue";
import "element-ui/lib/theme-chalk/index.css";

import { Button, Input } from "element-ui";

Vue.config.productionTip = false;

Vue.use(Button);
Vue.use(Input);

new Vue({
  render: (h) => h(App),
}).$mount("#app");
