/**
 *  create haoxiaojun on 2018.7
 * -----------------------------------------------------
 * 1、实现一个Watcher，作为连接Observer和Compile的桥梁
 * 2、通知和添加订阅者
 * -----------------------------------------------------
 */
class Watcher {
  /**
   *Creates an instance of Watcher.
   * @param {*} vm 当前实例
   * @param {*} expOrFn 表达式
   * @param {*} cb 更新回调用
   * @memberof Watcher
   */
  constructor(vm,expOrFn,cb){
    this.$vm = vm
    this.$expOrFn = expOrFn
    this.$cb = cb
    this.value = this.get()
  }
  get(){
    // 添加订阅者
    Dep.target = this;
    // let dep = new Dep()
    // 去modal中取值，这个时候必然会触发defineProperty的getter，真正的push订阅者
    let value = this.getVMVal(this.$vm,this.$expOrFn)
    // 用完了，重置回去
    Dep.target = null
    return value
  }
  /**
   * 取modal里的值
   *
   * @param {*} vm 当前实例
   * @param {*} expr 表达式
   * @returns 返回指
   * @memberof Watcher
   */
  getVMVal(vm,expr){
    // return vm[expr] 要考虑，a.b.c的情况
    let exp = expr.split(".");
    let val = vm
    exp.forEach((k)=>{
      val = val[k]
    })
    return val
  }
  // 对外暴露的跟新方法，比较新老值，得到订阅通知进行更新
  update(){
    let oldVal = this.value;
    let newVal = this.getVMVal(this.$vm,this.$expOrFn)
    if (newVal !== oldVal) {
        this.value = newVal;
        this.$cb(newVal, oldVal);
    }
  }
}