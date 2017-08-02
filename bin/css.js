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

	console.log('处理:', filePath)

	let cssFilePath = path.resolve( filePath );
	let fsStat = '';


	let doThisCss = () => {
		let _css = SAVE_CSS_SPACE[cssFilePath];
		// 源码
		_css.origin = fs.readFileSync(filePath, 'utf8');
		// 引用
		_css.import = getImportCss(_css.origin, cssFilePath);
		// 间接引用 css
		_css.mod = [];

		for (let i = 0,l = _css.import.length; i < l; i++) {

			let imCssResolve = _css.import[i].resolve;

			clearCssData( imCssResolve ) 

			if (!(imCssResolve in _css.mod)) {
				_css.mod.push( {
					// 路径
					path: imCssResolve,
					// 修改时间
					mtime: SAVE_CSS_SPACE[imCssResolve].stat.mtime
				})

				_css.mod = _css.mod.concat( SAVE_CSS_SPACE[imCssResolve].mod )
			}
		}

		// 处理后数据
		_css.data = _css.origin
				.replace( /(\/\*.+[\n\r])?@import.+;/gi, '')
				.replace( /[\r\n]{2,}/g, '\r\n' )
				.replace( /@charset\s['"](utf)-?8['"];?/i, '')
				.replace( /(\.{2}\/)+/g, '../');

	}


	// 读取状态
	try {
		fsStat = fs.statSync( filePath );
	} catch (err) {
		fsStat = '';
	}

	// 内存存储
	if ( cssFilePath in SAVE_CSS_SPACE) {
		console.log('存在');

		if (SAVE_CSS_SPACE[cssFilePath].stat && SAVE_CSS_SPACE[cssFilePath].stat.mtime < fsStat.mtime) {

			doThisCss();
		} else {
			console.log(cssFilePath, '自己不用更新的,检查他的模板调用');

			console.log(SAVE_CSS_SPACE[cssFilePath].mod);

			for ( let val of SAVE_CSS_SPACE[cssFilePath].mod) {

				let modStat;

				try {
					modStat = fs.statSync( val );
				} catch (err) {
					console.log(err);
					return;
				}

				// 更新 当前文件比内存的新
				if (modStat.mtime > SAVE_CSS_SPACE[val].stat.mtime) {



					// 结束遍历,更新文件
					return;
				} 
				// 相同 不用更新
				else {

				}
				console.log('*', val )

			}
		}

	} else {
		console.log('不存在');

		SAVE_CSS_SPACE[cssFilePath] = {};
		// 添加文件状态
		SAVE_CSS_SPACE[cssFilePath].stat = fsStat;
		SAVE_CSS_SPACE[cssFilePath].resolve = cssFilePath;

		if (fsStat)
			doThisCss();
	}

}


function css(entryFile, outFile, callback) {

	clearCssData( entryFile );

	// console.log(SAVE_CSS_SPACE)
	console.log(Object.keys(SAVE_CSS_SPACE).length)

}

module.exports = css;

