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



// 遍历模板
function eachMods (modArr) {

	let maxTime = '';

	// 查看 mod 是否有变化
	for (let val of modArr) {

		// 在内存中
		if (val.path in SAVE_CSS_SPACE) {

			let valInRAM = SAVE_CSS_SPACE[val.path];

			// 不存在时间,就是不存在此文件
			if (!val.mtime) continue;

			if (val.mtime < valInRAM.stat.mtime) {
				
				if (valInRAM.stat.mtime > maxTime)
					maxTime = valInRAM.stat.mtime
			} 
			// 相同时
			// 读取实体文件,再比较一次
			else {

				let modStat = getFileStat( val.path );

				// 更新 当前文件比内存的新
				if (+modStat.mtime > +valInRAM.stat.mtime) {

					// 更新内存文件 方便后面调用了此模板的文件不用去读文件
					valInRAM.stat = modStat;

					doThisCss( val.path )


				}

				if (modStat.mtime > maxTime)
					maxTime = modStat.mtime

			}
		}
		// 不在内存
		else {
			console.log('内存中不存在此文件:', val.path )
		}


	}

	return maxTime;
}


// 读取文件信息
function getFileStat (filePath) {
	
	let fsStat

	// 读取自己的状态
	try {
		fsStat = fs.statSync( filePath );
	} catch (err) {
		fsStat = '';
	}

	return fsStat;		
}


/*
	处理格式
*/
function doThisCss (filePath) {
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


/*
	将数据追加内存
	@filePath 文件地址
*/
function clearCssData (filePath) {

	let fsStat = getFileStat( filePath );
	let needUpdateFromMod = false;

	// 内存存储
	if ( filePath in SAVE_CSS_SPACE ) {
		// 当前文件在内存中的状态及修改时间 小于 硬盘中修改的时间
		if (SAVE_CSS_SPACE[filePath].mtime < fsStat.mtime) {

			SAVE_CSS_SPACE[filePath].mtime = fsStat.mtime

		} 

	} else {

		// 不存在,追加内存
		SAVE_CSS_SPACE[filePath] = {};

		// 添加文件状态
		SAVE_CSS_SPACE[filePath].stat = fsStat;
		SAVE_CSS_SPACE[filePath].resolve = filePath;
		
		// 是否要保存到硬盘(在本身修改或模板修改过要保存到硬盘)
		if ( !filePath.includes('parts/') )
			SAVE_CSS_SPACE[filePath].mtime = fsStat.mtime;

		if (fsStat) {
			doThisCss( filePath );
		}
	}

}

/*
	合并样式
	--------------------------------------
*/
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

			if (callback) callback(err)
			return;
		}

		if (callback) callback(true)
	})	
}

/*
	压缩文件
*/
function minCss (savePath, data, minCallback) {
	
	let result = data.replace(/(\t|\s{2,}|\/\*(.|\r\n|\n)*?\*\/|\;(?=(\n|\r\n|\t)*?\})|\s(?=\{)|\s(?=\())/g, '')
	.replace(/:\s/g, ':')
	.replace(/,\s/g, ',')
	.replace(/\s>\s/g, '>')
	.replace(/[\r\n]/g, '');

	writeFileInner( savePath.replace('.css', '.min.css'), result, minCallback)

}


function css({entryFile, outFile,  min = false, callback}) {

	let cssFilePath = path.resolve( entryFile );

	clearCssData( cssFilePath );

	let saveFile = () => {
		console.log('ready')
		if (callback && callback.ready) {
			callback.ready({
				status: 'ready',
				msg: '准备输出文件'
			})
		}

		// 查看输出的文件有没有变化或是否存在
		let mergeData = mergeThisCssFile( cssFilePath );
		let mergeHead = `@charset 'utf-8';
/* 
	im-css
	------------------------------------
	(c) 2017 ektx
	Welcome Use It!
	
	API: 
	https://github.com/ektx/imCss
*/\r\n`;

		writeFileInner(outFile, mergeHead + mergeData, status => {
			if (callback && callback.out) {
				callback.out({
					status: true,
					msg: status
				})
			}
		})

		if (min)
			minCss(outFile, mergeData, status => {
				if (callback && callback.min) {
					callback.min({
						status: true,
						msg: status
					})
				}
			})

		SAVE_CSS_SPACE[cssFilePath].save = false;
	}

	// 判断源文件与输出文件的关系
	try {
		outFileStat = fs.statSync( outFile )
	} catch (err) {
		// 输出文件不存在,保存一份
		saveFile();
		return;
	}


	// 主要入口文件旧于目前保存的文件
	if (outFileStat.mtime < SAVE_CSS_SPACE[cssFilePath].mtime) {
		saveFile();
		return;
	} 
	// 目前保存好的文件新与主要入口文件
	else {
		// 最新变动的模板 新于 输出文件要保存
		if (eachMods( SAVE_CSS_SPACE[cssFilePath].mod ) > outFileStat.mtime) {
			saveFile();
			return;
		}
	}


	if (callback) {

		if (callback.out) {
			callback.out({
				status: false,
				msg: '文件无修改,不用保存到硬盘'
			})
		}

		if (min && callback.min) {
			callback.min({
				status: false,
				msg: '文件无修改,不用保存到硬盘'
			})
		}
	}


}

module.exports = css;

