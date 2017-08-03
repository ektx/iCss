
const css = require('../index');

css('css/demo.css', 'dist/demo.css', (r) => {
	console.log(r)
}, true, (min) => {
	console.log(min)
})

css('css/demo.css', 'dist/demo2.css', null, true, (min) => {
	console.log(min)
})