
const dirFiles = require('../bin/dirFiles');


console.log( dirFiles('./css', false).map((val)=>{
	return val.name
}) )

console.log( dirFiles('./css', true).map((val)=>{
	return val.path
}) )