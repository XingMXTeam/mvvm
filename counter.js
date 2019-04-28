export default {
  name: "counter",
  template: `
    <div>
      {{count}}
      <button @click="count++">increment</button>
    </div>
  `,
  // 必须是方法
  data() {
    return {
      count: 0
    }
  }
};