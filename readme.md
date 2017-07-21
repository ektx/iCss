# imCss

用于合并css与压缩样式表.



#### 安装

```Sh
npm install im-css
```



#### 使用

```javascript
// 引入
const imcss = require('im-css');

// 处理文件
imcss({
  file: 'css/entry.css',
  out: 'dist/out.css'
}, result => {
  // 错误信息
  console.error(result.error);
  // 保存状态
  console.warn(result.save);
  // min 文件
  console.log(result.min);
  // 合并文件
  console.log(result.data);
})
```

