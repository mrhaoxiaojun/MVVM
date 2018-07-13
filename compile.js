/**
 *  create haoxiaojun on 2018.7
 * -----------------------------------------------------
 * 1、取真实dom节点
 * 2、我们fragment 创建文档碎片，将真是dmo，移动指缓存
 * 3、编译虚拟dom，解析模版语法
 * 4、回填至真是dom，实现模版语法解析，更新试图
 * -----------------------------------------------------
 */
class Compile{
  /**
   * 
   *Creates an instance of Compile.
   * @param {*} el dmo选择器
   * @param {*} vm 当前实例
   * @memberof Compile
   */
  constructor(el,vm){
    this.$vm = vm;
    this.$el = this.isElementNode(el) ? el : document.querySelector(el)
    if(this.$el){
      this.$fragment = this.node2Fragment(this.$el)
      this.init()
      this.$el.appendChild(this.$fragment)
    }
  }
  init(){
    this.compileElement(this.$fragment)
  }
  /**
   *
   * 编译element
   * @param {*} el dmo节点
   * @memberof Compile
   */
  compileElement(el){
    // 1、取所有子节点
    let childNodes = el.childNodes
    // 2、循环子节点
    Array.from(childNodes).forEach((node)=>{
      // 判断是文本节点还是dom节点
      if(this.isElementNode(node)){
        this.compileDom(node)
      }else if (this.isTextNode(node)){
        this.compileText(node)
      }
      // 判断当前节点是否有子节点，如果有，递归查找
      if(node.childNodes && node.childNodes.length){
        this.compileElement(node)
      }
    })
  }
  /**
   *
   * 编译元素节点
   * @param {*} node 需要编译的当前节点
   * @memberof Compile
   */
  compileDom(node){
    // 取当前节点的属性集合
    let attrs = node.attributes
    // 循环属性数组
    Array.from(attrs).forEach(attr => {
      let attrName = attr.name
      // 判断当前属性是否是指令
      if(this.isDirective(attrName)){
        let [,dir] = attrName.split("-")
        let expr = attr.value
        //判断当前属性是普通指令还是事件指令
        if(this.isEventDirective(dir)){
          compileUtil.eventHandler(node,expr,dir,this.$vm)
        }else{
          compileUtil[dir] && compileUtil[dir](node,expr,this.$vm)
        }
      }
    });
  }
  /**
   * 
   * 编译文本节点
   * @param {*} node 需要编译的当前节点
   * @memberof Compile
   */
  compileText(node){
    var text = node.textContent;
    var reg = /\{\{(.*)\}\}/;
    if(reg.test(text)){
      compileUtil.text(node,RegExp.$1,this.$vm)
    }
  }
  /**
   * 判断是否是元素节点
   *
   * @param {*} el 节点
   * @returns 是否
   * @memberof Compile
   */
  isElementNode(el){
    return el.nodeType == 1
  }
  /**
   * 过滤是否是指令
   *
   * @param {*} name 属性名
   * @returns 是否
   * @memberof Compile
   */
  isDirective(name){
    return name.indexOf("v-") == 0
  }
  /**
   * 判断是否是事件指令
   *
   * @param {*} dir 指令,on:click
   * @returns 是否
   * @memberof Compile
   */
  isEventDirective(dir){
    return dir.indexOf("on") == 0
  }
  /**
   * 判断是否是文本节点
   *
   * @param {*} el 节点
   * @returns 是否
   * @memberof Compile
   */
  isTextNode(el){
    return el.nodeType == 3
  }
  /**
   * 将真实dom拷贝到内存中
   *
   * @param {*} el 真实dom
   * @returns 文档碎片
   * @memberof Compile
   */
  node2Fragment(el){
    let fragment = document.createDocumentFragment();
    let children
    while(children = el.firstChild){
      fragment.appendChild(el.firstChild)
    }
    return fragment
  }
}

// 指令处理工具
let compileUtil = {
  /**
   * 处理文本节点
   *
   * @param {*} node 当前节点
   * @param {*} expr 表达式
   * @param {*} vm 当前实例
   */
  text(node,expr,vm){
    this.buid(node,expr,vm,"text")
  },
  /**
   * 处理表单元素节点
   *
   * @param {*} node 当前节点
   * @param {*} expr 表达式
   * @param {*} vm 当前实例
   */
  model(node,expr,vm){
    this.buid(node,expr,vm,"model")
    var me = this,
    val = this.getVMVal(vm, expr);
    node.addEventListener('input', function(e) {
        var newValue = e.target.value;
        if (val === newValue) {
            return;
        }

        me.setVMVal(vm, expr, newValue);
        val = newValue;
    });
  },
  /**
   * 事件处理
   *
   * @param {*} node 当前节点
   * @param {*} expr 表达式
   * @param {*} dir 指令
   * @param {*} vm 当前实例
   */
  eventHandler(node,expr,dir,vm){
    let [,eventType] = dir.split(":");
    let fn = vm.$opt.methods && vm.$opt.methods[expr]
    if(eventType && fn){
      node.addEventListener(eventType,fn.bind(vm),false)
    }
  },
  /**
   * 绑定事件统一处理方法抽离，添加watcher
   *
   * @param {*} node 当前节点
   * @param {*} expr 表达式
   * @param {*} vm 当前实例
   * @param {*} dir 指令
   */
  buid(node,expr,vm,dir){
    let updateFn = update[dir+'Update']
    updateFn && updateFn(node,this.getVMVal(vm,expr))

    new Watcher(vm, expr, function(value, oldValue) {
      updateFn && updateFn(node, value, oldValue);
  });
  },
  /**
   * 获取表达式代表的值
   *
   * @param {*} vm 当前实例
   * @param {*} expr 表达式
   * @returns
   */
  getVMVal(vm,expr){
    // return vm[expr] 要考虑，a.b.c的情况
    let exp = expr.split(".");
    let val = vm
    exp.forEach((k)=>{
      val = val[k]
    })
    return val
  },
  /**
   * 设置更新数据里对应的表达式的值
   *
   * @param {*} vm
   * @param {*} expr
   * @param {*} newValue
   */
  setVMVal(vm,expr,newValue){
    let exp = expr.split('.');
    let val = vm
    exp.forEach((key,i)=>{
      if(i<exp.length-1){
        val = val[key]
      }else{
        val[key] = newValue
      }
    })
  }
}
// 数据更新
let update = {
  textUpdate(node,value){
    node.textContent = typeof value == 'undefined' ? '' : value
  },
  modelUpdate(node,value){
    node.value = typeof value == 'undefined' ? '' : value
  }
}