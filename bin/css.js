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
				_obj.comment = val.match(/\/\*((.|\n)*?)\*\//)[1]
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

	let fsStat = '';
	let needUpdateFromMod = false;


	let doThisCss = (filePath) => {
		let _css = SAVE_CSS_SPACE[filePath];
		// 源码
		_css.origin = fs.readFileSync(filePath, 'utf8');
		// 引用
		_css.import = getImportCss(_css.origin, filePath);
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

				if (SAVE_CSS_SPACE[imCssResolve].mod)
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


	// 读取自己的状态
	try {
		fsStat = fs.statSync( filePath );
	} catch (err) {
		fsStat = '';
	}

	// 内存存储
	if ( filePath in SAVE_CSS_SPACE) {
		console.log('存在');

		// 1. 更新自己的模板
		// 查看 mod 是否有变化
		for (let val of SAVE_CSS_SPACE[filePath].mod) {
			console.log('*', val )

			let valInRAM = SAVE_CSS_SPACE[val.path];

			// 不存在时间,就是不存在此文件
			if (!val.mtime) continue;


			if (val.mtime < valInRAM.stat.mtime) {
				// 更新 因为自己引用的文件没有内存中的新
				console.log('U')
				needUpdateFromMod = true;
			} 
			// 相同时
			// 读取实体文件,再比较一次
			else {

				let modStat;

				try {
					modStat = fs.statSync( val.path );
				} catch (err) {
					console.log(err);
				}

				// 更新 当前文件比内存的新
				if (modStat.mtime > valInRAM.stat.mtime) {

					// 更新 因为文件夹中的文件比内存中的新
					needUpdateFromMod = true;

					// 更新内存文件 方便后面调用了此模板的文件不用去读文件
					valInRAM.stat = modStat;

					doThisCss( val.path )

				} 

			}

		}

		if (SAVE_CSS_SPACE[filePath].stat && SAVE_CSS_SPACE[filePath].stat.mtime < fsStat.mtime) {

			doThisCss( filePath );
		} else {
			console.log(filePath, '自己不用更新的,检查他的模板调用');


			if (needUpdateFromMod) {
				console.log('这个文件要更新')


			} else {
				console.log('这个文件不要更新')
			}
		}

	} else {
		console.log('不存在,追加内存');

		SAVE_CSS_SPACE[filePath] = {};
		// 添加文件状态
		SAVE_CSS_SPACE[filePath].stat = fsStat;
		SAVE_CSS_SPACE[filePath].resolve = filePath;

		if (fsStat)
			doThisCss( filePath );
	}

}


function mergeThisCssFile( entryFile ) {
	let result = [];
	let CssInRAM = SAVE_CSS_SPACE[entryFile];
	let fileName = path.basename(entryFile);

	result.push(`\n\n/*=========== START ${fileName} ===========*/\n`)

	if (CssInRAM.import && CssInRAM.import.length > 0) {

		for (let val of CssInRAM.import) {

			let valPath = val.resolve;
			let valInner = SAVE_CSS_SPACE[valPath];

			result.push(`/*----------- START ${fileName} IMPORT ------------\n`)
			if (val.comment) {
				result.push( '\n'+ val.comment +'\n')
			}

			result.push(`${fileName} > ${path.basename(valPath)}(${val.importPath})\n-----------------------*/\n`)


			result.push( mergeThisCssFile( valPath ) );

		}
	}

	result.push(`/*----------- START ${fileName} INNER ------------*/\n`)
	result.push( CssInRAM.data )
	result.push(`\n/*=========== END ${fileName} ============*/\n\n`)

	return result.join('')

}

/*
	@callback 返回一个保存成功与否的状态,成功 true,失败是 false
*/
function writeFileInner (savePath, saveData, callback) {

	fs.writeFile(savePath, saveData, 'utf8', err => {
		if (err) {
			console.log('保存文件时出错!\n'+ err);

			if (callback) callback(false)
			return;
		}

		if (callback) callback(true)
	})	
}


function minCss (savePath, data, minCallback) {
	
	let result = data.replace(/(\t|\s{2,}|\/\*(.|\r\n|\n)*?\*\/|\;(?=(\n|\r\n|\t)*?\})|\s(?=\{)|\s(?=\())/g, '')
	.replace(/:\s/g, ':')
	.replace(/,\s/g, ',')
	.replace(/\s>\s/g, '>')
	.replace(/[\r\n]/g, '');

	writeFileInner( savePath.replace('.css', '.min.css'), result, minCallback)

}


function css(entryFile, outFile, callback, nodeMin = false, minCallback) {

	let cssFilePath = path.resolve( entryFile );

	clearCssData( cssFilePath );

	let mergeData = mergeThisCssFile( cssFilePath );

	writeFileInner(outFile, mergeData, callback)

	if (nodeMin)
		minCss(outFile, mergeData, minCallback)

}

module.exports = css;

