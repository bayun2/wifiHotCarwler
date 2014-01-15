// 获取wifi热点所有城市
var phantom = require('phantom');
var async   = require('async');
var robot   = require('./robot');
var fs      = require('fs');
var iRequest = require('request');

var defaultConfig = {
	'homepage' : 'http://wlan.vnet.cn/',
	'areaInfoPath' : '/changeArea?areaId={{areaId}}&lang=zh'
}

function fire() {
	// 设置request 修改默认 userAgent
	var defaultsOptions = {
		headers : {
			'User-Agent' : 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36'
		}
	}
	var iRequestObj = iRequest.defaults(defaultsOptions);
	async.waterfall([
			function(callback) {
				phantom.create("--web-security=no", "--ignore-ssl-errors=yes", 
					{port:12345}, function(ph) {
						console.log("phantom bridge initiated");
						callback(null, ph);
					})
			},
			function(ph, callback) {
				ph.createPage(function(page) {
					console.log("page created");
					callback(null, page);
				})
			},
			function(page, callback) {
				page.open("http://wlan.vnet.cn/", function(status) {
					if (status == "success") {
						// 网站快照
						page.render("wifihotpoint.png");
						page.evaluate(function() {
							var areaTrs = document.querySelectorAll('#provinceTable table tr');
							var areaIds = [];
							for (var i=0,len=areaTrs.length;i<len;i++) {
								var areaItems = areaTrs[i].querySelectorAll("td:last-child a");
								areaItems.forEach(function() {
									areaIds.push(value.getAttribute('onclick')
													.match(/City\((\d+),.*\)/)[1]);
									
								})
							}
							page.close();
							callback(null, areaIds);
						})
					}
				})
			}
		],
		function(err, areaIds) {
			if (err) {
				console.log(err);
				throw err;
			}
			var areaInfos = [];
			async.eachSeries(areaIds, 
				function(item, callback) {
					iRequestObj(options.homepage + options.areaInfoPath.replace('{{areaId}}', item), 
						function(error, response, body) {
							areaInfos.push(JSON.parse(body));
							callback();
						}
				),
				function(err) {
					if (err) {
						console.log(err);
						throw err;
					}
					var areaWriteAble = fs.createWriteStream('area.json');
					areaWriteAble.write(JSON.stringify(areaInfos), function(err) {
						if (err) {
							console.log(err);
							throw err;
						}
						console.log("保存了所有市信息");
					})
				}
			})
			
		}
	)
}

exports.fire = fire;