var robot = require("./robot");
var cf = require("./area-task");
var fs = require("fs");
var argv = require("optimist").usage('Usage: $0 -t [string]')
							  .demand('t')
							  .describe('t', '城市Id,值为cf启动抓取所有免费书籍任务')
							  .argv;

if (argv.t == "cf") {
	fs.exists('./area.json', function(exists) {
		if (exists) {
			console.log('使用已经保存的市信息列表');
			fs.readFile('./area.json', function(err, file){
				var areaInfos = JSON.parse(file.toString());
				var areaId = [];
				areaInfos.forEach(function(areaInfo) {
					areaId.push(areaInfo.areaId.toString();)
				})
				robot.fire({areaId:areaId});
			});
		} else {
			console.log('抓取城市列表');
			cf.fire();
		}
	})
	// 北京，上海
	// robot.fire({areaId:JSON.parse('["354","355"]')});
}

