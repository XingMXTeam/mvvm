import myhead from './myhead.js'
export default {
  name: "counter",
  components: {
    myhead
  },
  template: `
    <div>
      <myhead></myhead>
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