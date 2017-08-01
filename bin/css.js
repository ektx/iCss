/*
	imCss
	-----------------------------------
	API
	https://github.com/ektx/imCss
*/


const fs = require('fs');
const path = require('path');

// 保存样式
const SAVE_CSS_SPACE = {};


/*
	@data  样式内容
	@parentFilePath 父级路径
*/
function getImportCss (data, parentFilePath) {
	let newArr = [];
	let arr = data.match( /(\/\*.+[\n\r])?@import.+;/gi )
	let cssDir = path.dirname(parentFilePath)

	if (arr && arr.length > 0) {

		for (let val of arr) {

			let _obj = {};

			// 注释
			if ( /[\n\r]/.test(val) ) {
				_obj.comment = val.match(/\/\*.*\*\//)[0]
			}

			// 引入路径
			_obj.importPath = val.match(/\((.+)\)/)[1];

			if( /'|"/.test(_obj.importPath) ) {
				_obj.importPath = _obj.importPath.replace(/'|"/g, '')
			}

			// 引入文件的绝对路径
			_obj.resolve = path.resolve(cssDir, _obj.importPath);

			newArr.push(_obj)
		}
	}

	return newArr; 
}


function clearCssData (filePath) {

	let fsStat = fs.statSync( filePath );
	let cssFilePath = path.resolve( filePath );

	let doThisCss = () => {
		let _css = SAVE_CSS_SPACE[cssFilePath];
		_css.origin = fs.readFileSync(filePath, 'utf8');

		_css.import = getImportCss(_css.origin, cssFilePath);

		_css.get = [];

		for (let i = 0,l = _css.import.length; i < l; i++) {
			if (!(_css.import[i].resolve in _css.get)) {
				_css.get.push( _css.import[i].resolve )
			}
		}

		_css.data = _css.origin
				.replace( /(\/\*.+[\n\r])?@import.+;/gi, '')
				.replace( /[\r\n]{2,}/g, '\r\n' )
				.replace( /@charset\s['"](utf)-?8['"];?/i, '')
				.replace( /(\.{2}\/)+/g, '../');

		console.log( _css );

	}


	if ( cssFilePath in SAVE_CSS_SPACE) {
		console.log('存在');

		if (SAVE_CSS_SPACE[cssFilePath].stat.mtime < fsStat.mtime) {
			doThisCss();
		} else {
			console.log('不用更新的')
		}

	} else {
		console.log('不存在');

		SAVE_CSS_SPACE[cssFilePath] = {};

		doThisCss();
	}

}


function css(entryFile, outFile, callback) {

	clearCssData( entryFile );

}

module.exports = css;

