/* =======================================================
	 Copyright 2014 - ePortfolium - Licensed under the
	 Educational Community License, Version 2.0 (the "License"); you may
	 not use this file except in compliance with the License. You may
	 obtain a copy of the License at

	http://www.osedu.org/licenses/ECL-2.0

	Unless required by applicable law or agreed to in writing,
	software distributed under the License is distributed on an "AS IS"
	BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
	or implied. See the License for the specific language governing
	permissions and limitations under the License.
   ======================================================= */


var http = require('http');
var util = require('util');
var jsdom = require('jsdom');
var req = require('request');
var url = require('url');

/// Defining stuff since we bootstrap report.js
GLOBAL.USER={};
GLOBAL.USER.id=1;
GLOBAL.UIFactory = {};
GLOBAL.DOMParser= require('xmldom').DOMParser;
// Proxy redirection
GLOBAL.serverBCK = 'http://127.0.0.1:8081/karuta-backend?http://127.0.0.1:8080/karuta-backend/rest/api';
GLOBAL.languages = ['en','fr'];
GLOBAL.LANG = "fr"
GLOBAL.LANGCODE = 1;
GLOBAL.g_userrole = 'designer';
GLOBAL.g_encrypted = false;

var appliname = "karuta";
var cjar = jsdom.createCookieJar();
var currentCode = "";

var Queue = function()
{
	// Actual usable size will have -1
	// Minimum should be 2
	this.MAXQUEUE=8;
	this.q = new Array(this.MAXQUEUE);
	this.head = 0;
	this.tail = 0;
};

Queue.prototype.size = function()
{
	if( this.tail >= tail.head )
		return this.tail-this.head;
	else
		return this.tail + this.MAXQUEUE-this.head;
};

// Fetch value without dequeueing
Queue.prototype.get = function()
{
	if( this.tail != this.head )
		return this.q[this.head];
	return null;
}

Queue.prototype.queue = function( value )
{
	// Check if there's space to add
	if( this.tail >= this.head )
	{
		this.q[this.tail] = value;
		// Check if we haven't reached the end
		if( this.tail < this.MAXQUEUE-1 )
			this.tail += 1;
		else	// Reached end, loop back
			this.tail = 0;
	}
	else	// Check if we aren't catching up with head
	{
		if( this.tail+1 == this.head )
			// Can't add since we won't know if empty or not (or add a flag)
			return false;
		else
			this.q[this.tail] = value;
		this.tail += 1;
	}
	return true;
};

Queue.prototype.dequeue = function()
{
	if( this.tail == this.head )	// Empty
		return null;

	var d = this.q[this.head];
	if( this.head +1 < this.MAXQUEUE )
		this.head += 1;
	else
		this.head = 0;
	return d;
};

// List of code that needs to be processed
// Will always be empty or ==1, unless there's some really long running job
var isactive = false;
var jobqueue = new Queue();

// Ensure we run only 1 job at a time.
// Limitation due to how the code called is written and nodejs memory management
var executeTopJob = function()
{
	if( !isactive )
	{
		// Get and remove first job
		code = jobqueue.get();
		// If we ask to process something and nothing remains,
		if( code != null )
		{
			// Set active state
			isactive = true;

			// Execute report on it (while passing thing function as callback)
			login(code);
			// And now we wait till report returns from it
		}
	}
};

var jobFinished = function()
{
	var d = new Date();
	console.log('JOB FINISHED AT: '+d);
	var fs = require('fs');
	var code = jobqueue.dequeue();
	var content = $('#content').html();
	fs.writeFile("reports/"+code, content, function(err){
		if(err) console.log(err);
	})
	isactive = false;
	executeTopJob();
};


var login = function( code )
{
	var conf = {
		html: '<html><body><div id="content"></div></body></html>',
		cookieJar: cjar,
		parsingMode: 'xml',
		done: function(error, window)
		{
			GLOBAL.mydoc = window;
			GLOBAL.$ = require('jquery')(window, 'Local');

			GLOBAL.$.ajaxSetup({
				error: function(data) {
					var util = require("util");
					console.log("DEFAULT ERROR HANDLER: "+util.inspect(data));
				},
				xhrFields: {
					withCredentials: true
				}
			});

			// Read file named 'access' and load password, don't keep it
			var fs = require('fs');
			var data = fs.readFileSync('access', {encoding: 'utf-8', flag: 'r'});
			var data = data.split('\n');

			GLOBAL.$.ajax({
				contentType: 'application/xml',
				type: "POST",
				url: 'http://127.0.0.1:8081/karuta-backend?http://127.0.0.1:8080/karuta-backend/rest/api/credential/login',
				dataType: 'xml',
				data: '<credential><login>'+data[0]+'</login><password>'+data[1]+'</password></credential>',
				// Never happen since it can't parse xml as of now or hidden option (Feb 2016)
				success: function(data, status, error){ console.log('RELOG SUCCESS'); },
				error: function(data, status, error)
				{
					console.log("====== FETCHING CODE =====");
					fetchCode(code);
				}
			});
		},
	};
	var basehtml = '<html><body><div id="content"></div></body></html>';
	var doc = jsdom.env(conf);
}


var fetchCode = function( code )
{
	console.log("====== REPORT URL =====");
	
	// Relog
	GLOBAL.$.ajax({
		contentType: 'application/xml',
		type: "GET",
		url: 'http://127.0.0.1:8081/karuta-backend?http://127.0.0.1:8080/karuta-backend/rest/api/portfolios/portfolio/code/'+code,
		dataType: 'xml',
		success: function(data, status, error)
		{
			console.log("======== SUCCESS CODE =====");
		},
		error: function(data, status, error)
		{
			var nodeid = $("asmRoot", data.responseText).attr("id");
			console.log("======== ERROR CODE =====");
			console.log("====== FETCHING CONVERTED @ "+nodeid+" ====");
			console.log("DATA: "+nodeid);
			GLOBAL.$.ajax({
				contentType: 'application/xml',
				type: "GET",
				url: 'http://127.0.0.1:8081/karuta-backend?http://127.0.0.1:8080/karuta-backend/rest/api/nodes/'+nodeid+"?xsl-file="+appliname+"/karuta/xsl/karuta2report.xsl&lang="+LANG,
				dataType: 'xml',
				success: function(data, status, error)
				{
					console.log('===== FETCH SUCCESS ========');
				},
				error: function(data, status, error)
				{
					console.log("====== FETCH ERROR ======");
					console.log("DATA: "+data.responseText);
					var report = require('./report');
					var dom = new DOMParser().parseFromString(data.responseText);
					report.process(dom, jobFinished);
					/// Timing issue
					var result = $('#content').html();

					// Ask to write stuff
					console.log("======= END OF REPORT PART =======");
				}
			});
		}
	});
};

var processReport = function( code )
{
	// Add a job on the queue
	jobqueue.queue(code);
	// Ask to process everything;
	executeTopJob();
};

/// Receive configuration info to write somehere
/// Daemon runs and execute task
/// Write result in a file
/// Send pre-processed data when asked

module.exports =
{
	processReport: processReport,
	cookie: function()
	{
		if( typeof cjar.store.idx['127.0.0.1'] != 'undefined' )
			return cjar.store.idx['127.0.0.1']['/karuta-backend/'].JSESSIONID;
		return null;
	},
};

