const css = require('../index');

// 测试多级功能
css({
	file: 'css/muliteLevel.css', 
	out: 'dist/muliteLevel.css'
}, (r)=> {
	console.log(r.save)
	console.log(r.error)
});


result = css({
	file: 'css/layout.css', 
	out: 'dist/layout.css'
}, (r)=> {

	console.log(r.save)
	console.log(r.error)
});
