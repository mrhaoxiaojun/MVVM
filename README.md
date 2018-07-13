---
title:  手把手带你走进MVVM
date: 2018-01-9 11:04:01 
categories: others 

---



[参考地址](https://github.com/DMQ/mvvm) 

[本文地址](https://github.com/mrhaoxiaojun/MVVM.git)

## 剖析Vue实现原理 - 如何实现双向绑定mvvm

![mvvm-jian](手把手带你走进MVVM/mvvm-jian.png)

<!--more-->

> 本文能帮你做什么？
> 1、了解vue的双向数据绑定原理以及核心代码模块
> 2、缓解好奇心的同时了解如何实现双向绑定

**特此申明**：*小编我怀着一颗诚挚的内心，通过github上牛人针对vue的mvvm的实现方案进行了解，已经对vue的一些应用经验及原理认识，后又进行es6改写，意在知其然知其所以然，在这里也是单纯实现经典的mvvm，代码比较粗糙简陋加之一些东西删减，本着分享的精神，拒绝单纯的拿来主义，万望各路码神海涵不足之处，在这里特别感谢各种无私奉献的分享者*

### 几种实现双向绑定的做法

目前几种主流的mvc(vm)框架都实现了单向数据绑定，而我所理解的双向数据绑定无非就是在单向绑定的基础上给可输入元素（input、textare等）添加了change(input)事件，来动态修改model和 view，并没有多高深。所以无需太过介怀是实现的单向或双向绑定。

实现数据绑定的做法有大致如下几种：

> 发布者-订阅者模式（backbone.js）

> 脏值检查（angular.js） 

> 数据劫持（vue.js）

**发布者-订阅者模式:** 一般通过sub, pub的方式实现数据和视图的绑定监听，更新数据方式通常做法是 `vm.set('property', value)`，不太熟悉去问一下度娘

这种方式现在毕竟太low了，我们更希望通过 `vm.property = value`这种方式更新数据，同时自动更新视图，于是有了下面两种方式

**脏值检查:** angular.js 是通过脏值检测的方式比对数据是否有变更，来决定是否更新视图，最简单的方式就是通过 `setInterval()` 定时轮询检测数据变动，当然Google不会这么low，angular只有在指定的事件触发时进入脏值检测，大致如下：

- DOM事件，譬如用户输入文本，点击按钮等。( ng-click )
- XHR响应事件 ( $http )
- 浏览器Location变更事件 ( $location )
- Timer事件( $timeout , $interval )
- 执行 $digest() 或 $apply()

**数据劫持:** vue.js 则是采用数据劫持结合发布者-订阅者模式的方式，通过`Object.defineProperty()`来劫持各个属性的`setter`，`getter`，在数据变动时发布消息给订阅者，触发相应的监听回调。

### 思路整理

已经了解到vue是通过数据劫持的方式来做数据绑定的，其中最核心的方法便是通过`Object.defineProperty()`来实现对属性的劫持，达到监听数据变动的目的，无疑这个方法是本文中最重要、最基础的内容之一，如果不熟悉defineProperty，猛戳[这里](http://www.baidu.com) 整理了一下，要实现mvvm的双向绑定，就必须要实现以下几点： 1、实现一个数据监听器Observer，能够对数据对象的所有属性进行监听，如有变动可拿到最新值并通知订阅者 2、实现一个指令解析器Compile，对每个元素节点的指令进行扫描和解析，根据指令模板替换数据，以及绑定相应的更新函数 3、实现一个Watcher，作为连接Observer和Compile的桥梁，能够订阅并收到每个属性变动的通知，执行指令绑定的相应回调函数，从而更新视图 4、mvvm入口函数，整合以上三者

![mvvm](手把手带你走进MVVM/mvvm.png)

不多赘述，一言不合就上图

大家可去下载去具体文件里面看，我写了详尽的注释，每个模块的功能，分工，每个方法任务，等等

上图为小编我根据自己的理解后重新绘制，本打算绘制再细一些，感觉会让人理解更复杂而后就有了上图，代码中如果问题，欢迎指正，一起学习，你们的start是小编的动力

下面为具体代码实现，为了大家方便我还是粘贴在readme里面，每个文件不多说了，前面做了文案及脑图思路梳理，文件里我也了详尽的注释

### MVVM.html

```
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>mvvm</title>
  <script src="./observer.js"></script>
  <script src="./watcher.js"></script>
  <script src="./compile.js"></script>
  <script src="./mvvm.js"></script>
  <!-- <script src="http://cdn.bootcss.com/vue/1.0.25/vue.js"></script> -->
</head>
<body id="app">
  <input type="text" v-model="msg">
  <div v-text="a.b"></div>
  <div>
    {{msg}}
  </div>
</body>
<script>
  let vm = new MVVM({
    el:"#app",
    data:{
      msg:"helloword",
      a:{
        b:"a"
      }
    }
  })
</script>
</html>
```

### MVVM.js

```
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
```

### Observer.js

```
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
```

## Compile.js

```
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
```

### Watcher.js

```
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
```



最后感谢您的阅读