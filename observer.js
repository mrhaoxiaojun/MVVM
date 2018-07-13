/**
 *  create haoxiaojun on 2018.7
 * -----------------------------------------------------
 * 1、实现一个数据监听器Observer
 * 2、通知和添加订阅者
 * -----------------------------------------------------
 */
class Observer {
  /**
   *Creates an instance of Observer.
   * @param {*} data 需要劫持监听的数据
   * @memberof Observer
   */
  constructor(data){
    this.$data = data || {}
    this.init()
  }
  init(){
    Object.keys(this.$data).forEach(key=>{
      this.defineReative(key,this.$data[key])
    })
  }
  defineReative(key,val){
    // 创建发布者-订阅者
    let dep = new Dep()
    // 再去观察子对象
    observe(val)
    Object.defineProperty(this.$data,key,{
      configurable:false,
      enumerable:true,
      get(){
        // 添加订阅者
        Dep.target && dep.addSub(Dep.target)
        return val
      },
      set(newVal){
        if( newVal == val ) return false;
        val = newVal
        // 新的值是object的话，进行监听
        observe(newVal)
        // 通知订阅者
        dep.notfiy()
      }
    })
  }
}
/**
 * 是否进行劫持监听
 *
 * @param {*} value 监听对象
 * @param {*} vm 当前实例
 * @returns 返回 监听实例
 */
function observe(value, vm) {
  if (!value || typeof value !== 'object') {
      return;
  }
  return new Observer(value);
};
class Dep{
  constructor(){
    this.subs = []
  }
  /**
   *维护订阅者数组
   *
   * @param {*} sub 订阅实例
   * @memberof Dep
   */
  addSub(sub){
    this.subs.push(sub)
  }
  notfiy(){
    this.subs.forEach(sub=>{
      // 通知数据更新
      sub.update()
    })
  }
}