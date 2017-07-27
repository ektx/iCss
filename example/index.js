
const css = require('../index');

css({
	file: 'css/demo.css',
	out: 'dist/demo.css'
}, (r) => {
	console.log(r)
})