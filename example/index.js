
const css = require('../index');

css({
	entryFile: 'css/demo.css',
	outFile:  'dist/demo2.css',
	min: true,
	callback: {
		ready: r => {
			console.log(r)
		},

		out: r => {
			console.log(r)
		},

		min: r => {
			console.log('min', r)
		}
	}
});

css({
	entryFile: 'css/demo.css',
	outFile:  'dist/demo.css',
	callback: {
		ready: r => {
			console.log(r)
		},

		out: r => {
			console.log(r)
		},

		min: r => {
			console.log('min', r)
		}
	}
})

