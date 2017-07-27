/*
	imCss
	-----------------------------------
	API
	https://github.com/ektx/imCss
*/


const fs = require('fs');
const path = require('path');

// 获取指定目录下所有的文件组件
const dirFiles = require('dirfiles');
// 保存样式
const SAVE_CSS_SPACE = {};

/*
	@data  样式内容
	@parentFilePath 父级路径
*/
function getImportCss (data, parentFilePath) {
	let newArr = [];

	let arr = data.match(/(\/\*.+[\n\r])?@import.+;/gi )

	if (arr && arr.length > 0) {

		for (let val of arr) {

			let _obj = {};

			if ( /[\n\r]/.test(val) ) {
				_obj.comment = val.match(/\/\*.*\*\//)[0]
			} else {
				_obj.comment = '无'
			}

			val = val.match(/@im.+['"$]/gi)[0];
			_obj.importPath = val.slice(13, val.length - 1);

			_obj.resolve = path.resolve(path.dirname(parentFilePath), _obj.importPath);

			newArr.push(_obj)
		}
	}

	return newArr; 
}

exports.getImportCss = getImportCss;



function css(options, callback) {

	let readDirAllCss = filePath => {

		if (filePath in SAVE_CSS_SPACE) {
			console.log('此文件已经读取过!')
		} else {
			// 得到父级地址
			let inputDirName = path.dirname(filePath);

			// 读取此文件所在父级目录下所有的文件
			let getAllCssPath = dirFiles(inputDirName, true);

			// 如果读取文件目录出错
			if (getAllCssPath.status) {

				SAVE_CSS_SPACE[filePath] = {
					originData: '',
					clearData: '/* 读取文件时错误,没有发现此文件所在的父级目录 */',
					status: 'error',
					error: getAllCssPath.error
				}
				return;
			};

			getAllCssPath.forEach( val => {

				// 对文件进行读取
				if (val.type === 'file' && path.extname(val.name) === '.css') {

					// 此文件未被读取在内存中
					if (!(val.path in SAVE_CSS_SPACE)) {

						try {
							let data = fs.readFileSync(val.path, 'utf8');
							
							SAVE_CSS_SPACE[path.resolve(val.path)] = {
								originData: data
							}
						} catch (err) {

							console.log('读取以下文件时错误:\n', val.path);
						}

					} else {
						console.log(val.path+' 已经存在!')
					}

				}

			})

		}
	}

	/*
		处理css
		--------------------------------------
		1.得到 import 所有内容
		2.得到除去了 import 和 @charset 的内容
	*/
	let doThisCssFile = (filePath) => {

		if (!(filePath in SAVE_CSS_SPACE)) {
			if (!result.error) {
				result.error = []
			}

			result.error.push( filePath );
			readDirAllCss( filePath )
			return;
		}

		// 已经处理过
		if (SAVE_CSS_SPACE[filePath].clearData) return;

		let dataParent = SAVE_CSS_SPACE[filePath];
		let data = dataParent.originData;

		dataParent.import = getImportCss( data, filePath );

		if (dataParent.import.length > 0) {
			for(let i = 0, l = dataParent.import.length; i < l; i++) {
				doThisCssFile( dataParent.import[i].resolve )
			}
		}


		dataParent.clearData = data
				.replace( /(\/\*.+[\n\r])?@import.+;/gi, '')
				.replace( /[\r\n]{2,}/g, '\r\n' )
				.replace( /@charset\s['"](utf)-?8['"];?/i, '')
				.replace( /(\.{2}\/)+/g, '../');

	}


	let mergeThisCssFile = (filePath) => {
		let result = [];
		let thisCss = SAVE_CSS_SPACE[path.resolve(filePath)];

		if (thisCss.import && thisCss.import.length > 0) {

			let imports = thisCss.import;

			for (let i = 0, l = imports.length; i < l; i++) {
				if (!imports[i].clearData) {

					let _comment = imports[i].comment;
					_comment = _comment.slice(2, _comment.length-2);

					// 添加模板数据
					result.push( `\r\n\r\n/*==================================== 
	Start ${_comment}
	${imports[i].importPath}
>>>>----------------------------->*/\r\n`  );
					result.push( mergeThisCssFile( imports[i].resolve ) );
					result.push( `\r\n/* <------------- END ${_comment} -------------<<<< */`  );
				}

			}
		} 

		// 添加自己的数据
		result.push( thisCss.clearData );

		return result.join('')
	}


	let writeFileInner = (fpath, data) => {
		
		fs.writeFile(fpath, data, 'utf8', err=> {
			if (err) {
				console.log('保存文件时出错! '+ err);
				result.save = false;

				if (callback) callback(result)
				return;
			}

			result.save = true;
			if (callback) callback(result)
			// console.log('保存成功:' + fpath)
		})

	}

	let minCss = data => {
		result.min = data.replace(/(\t|\s{2,}|\/\*(.|\r\n|\n)*?\*\/|\;(?=(\n|\r\n|\t)*?\})|\s(?=\{)|\s(?=\())/g, '')
		.replace(/:\s/g, ':')
		.replace(/,\s/g, ',')
		.replace(/\s>\s/g, '>')
		.replace(/[\r\n]/g, '');

		writeFileInner( options.out.substring(0, options.out.length - 3) + 'min.css', result.readmeInfo + result.min)
	}

	let result = {};

	result.readmeInfo = `@charset 'utf-8';
/* 
	imCss
	(c) 2017 ektx
	welcome use it!
	API: https://github.com/ektx/imCss
*/\r\n`

	// 读取当前样式目录下所有文件
	readDirAllCss(options.file)

	doThisCssFile( path.resolve(options.file) );

	result.data = mergeThisCssFile( options.file );

	minCss( result.data )

	writeFileInner( options.out, result.readmeInfo + result.data )

	return result

}

exports = css;

