/**
 *  create haoxiaojun on 2018.7
 * -----------------------------------------------------
 * 1、实现数据代理
 * 2、模版解析
 * 3、劫持监所有的属性
 * -----------------------------------------------------
 */
class MVVM {
  /**
   *Creates an instance of MVVM.
   * @param {*} options 当前实例传递过来的参数
   * @memberof MVVM
   */
  constructor(options){
    this.$opt = options|| {}
    this.$data = options.data;
    // 实现数据代理
    Object.keys(this.$data).forEach((key)=>{
      this._proxyData(key)
    })
    // 劫持监所有的属性
    observe(this.$data,this)
    // 模版编译
    new Compile(options.el || document.body,this)
  }
  _proxyData(key){
    Object.defineProperty(this,key,{
      configurable:false,
      enumerable:true,
      get(){
        return this.$data[key]
      },
      set(newVal){
        this.$data[key] = newVal
      }
    })
  }
}