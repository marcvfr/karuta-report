/* =======================================================
	Copyright 2014 - ePortfolium - Licensed under the
	Educational Community License, Version 2.0 (the "License"); you may
	not use this file except in compliance with the License. You may
	obtain a copy of the License at

	http://opensource.org/licenses/ECL-2.0

	Unless required by applicable law or agreed to in writing,
	software distributed under the License is distributed on an "AS IS"
	BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
	or implied. See the License for the specific language governing
	permissions and limitations under the License.
   ======================================================= */

var trace = false;
var xmlDoc = null;
var userid = null; // current user
var aggregates = {};

Selector = function(jquery,type,filter1,filter2)
{
	this.jquery = jquery;
	this.type = type;
	this.filter1 = filter1;
	this.filter2 = filter2;
};

//==================================
function getSelector(select,test)
//==================================
{
	if (test==null)
	 test = "";
	var selects = select.split("."); // nodetype.semtag.[node|resource] or .[node|resource]
	if (selects[0]=="")
		selects[0] = "*";
	var jquery = selects[0];
	var filter1 = null;
	var filter2 = null;
	if (selects[1]!="") {
		jquery +=":has(metadata[semantictag='"+selects[1]+"'])";
		filter1 = function(){return $(this).children("metadata[semantictag='"+selects[1]+"']").length>0};
	}
	var filter2 = test; // test = .has("metadata-wad[submitted='Y']").last()
	var type = selects[2];
	var selector = new Selector(jquery,type,filter1,filter2);
	return selector;
}

//==================================
function processPortfolio(no,xmlReport,destid,data,line)
//==================================
{
	var children = $(":root",xmlReport).children();
	no += destid;
	for (var i=0; i<children.length;i++){
		var tagname = $(children[i])[0].tagName;
		if (tagname=="table")
			processTable(no+"_"+i,children[i],destid,data,line);
		if (tagname=="row")
			processRow(no+"_"+i,children[i],destid,data,line);
		if (tagname=="cell")
			processCell(no+"_"+i,children[i],destid,data,line);
		if (tagname=="node_resource")
			processNodeResource(children[i],destid,data,line);
		if (tagname=="text")
			processText(children[i],destid,data,line);
		if (tagname=="for-each-node")
			processNode(no+"_"+i,children[i],destid,data,line);
		if (tagname=="for-each-portfolio")
			getPortfolios(no+"_"+i,children[i],destid,data,line);
	}
}

//==================================
function process(xmlDoc,json)
//==================================
{
//	$.ajaxSetup({async: false});
	console.log("===== REPORT STUFF ======");
	var children = $("model",xmlDoc).children();
	for (var i=0; i<children.length;i++){
		var tagname = $(children[i])[0].tagName;
		console.log("REPORT OUTPUT: "+tagname);
		if (tagname=="for-each-line")
			processLine(i,children[i],'content');
		if (tagname=="for-each-person")
			getUsers(i,children[i],'content');
		if (tagname=="for-each-portfolio")
		{
			console.log("FETCH PORTFOLIOS");
			getPortfolios(i,children[i],'content');
		}
		if (tagname=="FOR-EACH-PORTFOLIO")
		{
			console.log("FETCH PORTFOLIOS");
			getPortfolios(i,children[i],'content');
		}
		if (tagname=="table")
		{
			console.log("PROCESS TABLE");
			processTable(i,children[i],'content');
		}
		if (tagname=="aggregate")
			processAggregate(children[i],'content');
		if (tagname=="text")
			processText(children[i],'content');
	}
	console.log("END PROCESS =======")
	clearToken();
	displayPDFButton();
//	$.ajaxSetup({async: true});
}

//==================================
function processLine(no,xmlDoc,destid,data,line)
//==================================
{
	var ref_init = $(xmlDoc).attr("ref-init");
	//---------------------
	var children = $(">*",xmlDoc);
	for (var i=0; i<json.lines.length; i++){
		if (ref_init!=undefined) {
			var ref_inits = ref_init.split("/"); // ref1/ref2/...
			for (var k=0;k<ref_inits.length;k++)
				aggregates[ref_inits[k]] = new Array();
		}
		for (var j=0; j<children.length;j++){
			var tagname = $(children[j])[0].tagName;
			if (tagname=="for-each-person")
				getUsers(no+"_"+i,children[j],destid,data,i);
			if (tagname=="for-each-portfolio")
				getPortfolios(no+"_"+i,children[j],destid,data,i);
			if (tagname=="table")
				processTable(no+"_"+i,children[j],destid,data,i);
			if (tagname=="row")
				processRow(no+"_"+i,children[j],destid,data,i);
			if (tagname=="aggregate")
				processAggregate(children[i],destid,data,i);
		}
	}
}

//==================================
function processNode(no,xmlDoc,destid,data,line)
//==================================
{
	var select = $(xmlDoc).attr("select");
	var test = $(xmlDoc).attr("test");
	if (select!=undefined) {
		var selector = getSelector(select,test);
		var nodes = $(selector.jquery,data).filter(selector.filter1);
		nodes = eval("nodes"+selector.filter2);
		
		for (var i=0; i<nodes.length;i++){
			//---------------------------
			var ref_init = $(xmlDoc).attr("ref-init");
			if (ref_init!=undefined) {
				var ref_inits = ref_init.split("/"); // ref1/ref2/...
				for (var k=0;k<ref_inits.length;k++)
					aggregates[ref_inits[k]] = new Array();
			}
			//---------------------------
			var children = $(">*",xmlDoc);
			for (var j=0; j<children.length;j++){
				var tagname = $(children[j])[0].tagName;
				if (tagname=="for-each-node")
					processNode(no+"_"+i+"_"+j,children[j],destid,nodes[i],i);
				if (tagname=="table")
					processTable(no+"_"+i+"_"+j,children[j],destid,nodes[i],i);
				if (tagname=="row")
					processRow(no+"_"+i+"_"+j,children[j],destid,nodes[i],i);
				if (tagname=="cell")
					processCell(no+"_"+i+"_"+j,children[j],destid,nodes[i],i);
				if (tagname=="aggregate")
					processAggregate(children[i],destid,nodes[i],i);
				if (tagname=="node_resource")
					processNodeResource(children[i],destid,nodes[i],i);
				if (tagname=="text")
					processText(children[i],destid,nodes[i],i);
				if (tagname=="aggregate")
					processAggregate(children[i],destid,nodes[i],i);
			}
		};
	}
}

//==================================
function processTable(no,xmlDoc,destid,data,line)
//==================================
{
	var ref_init = $(xmlDoc).attr("ref-init");
	if (ref_init!=undefined) {
		var ref_inits = ref_init.split("/"); // ref1/ref2/...
		for (var i=0;i<ref_inits.length;i++)
			aggregates[ref_inits[i]] = new Array();
	}
	var html = "<table id='table_"+no+"'></table>";
	$("#"+destid).append($(html));
	var children = $(">*",xmlDoc);
	for (var i=0; i<children.length;i++){
		var tagname = $(children[i])[0].tagName;
		if (tagname=="for-each-line")
			processLine(no+"_"+i,xmlDoc,'table_'+no,data,'table_'+no);
		if (tagname=="for-each-person")
			getUsers(no+"_"+i,children[i],'table_'+no,data,line);
		if (tagname=="for-each-portfolio")
			getPortfolios(no+"_"+i,children[i],'table_'+no,data,line);
		if (tagname=="row")
			processRow(no+"_"+i,children[i],'table_'+no,data,line);
		if (tagname=="for-each-node")
			processNode(no+"_"+i,children[i],'table_'+no,data,line);
	};
}

//==================================
function processRow(no,xmlDoc,destid,data,line)
//==================================
{
	var html = "<tr id='tr_"+no+"'></tr>";
	$("#"+destid).append($(html));
	var children = $(">*",xmlDoc);
	for (var i=0; i<children.length;i++){
		var tagname = $(children[i])[0].tagName;
		if (tagname=="for-each-person")
			getUsers(no,children[i],'tr_'+no,data,line);
		if (tagname=="for-each-portfolio")
			getPortfolios(no,children[i],'tr_'+no,data,line);
		if (tagname=="cell")
			processCell(no+"_"+i,children[i],'tr_'+no,data,line);
		if (tagname=="for-each-node")
			processNode(no+"_"+i,children[i],'tr_'+no,data,line);
	}
}

//==================================
function processCell(no,xmlDoc,destid,data,line)
//==================================
{
	var html = "<td id='td_"+no+"'></td>";
	$("#"+destid).append($(html));
	var children = $(">*",xmlDoc);
	for (var i=0; i<children.length;i++){
		var tagname = $(children[i])[0].tagName;
		if (tagname=="for-each-person")
			getUsers(no,children[i],'td_'+no,data,line);
		if (tagname=="for-each-portfolio")
			getPortfolios(no,children[i],'td_'+no,data,line);
		if (tagname=="table")
			processTable(no,children[i],'td_'+no,data,line);
		if (tagname=="node_resource")
			processNodeResource(children[i],'td_'+no,data,line);
		if (tagname=="text")
			processText(children[i],'td_'+no,data,line);
		if (tagname=="aggregate")
			processAggregate(children[i],'td_'+no,data,line);
		if (tagname=="for-each-node")
			processNode(no,children[i],'td_'+no,data,line);
	}
}

//==================================
function getUsers(no,xmlDoc,destid,data,line)
//==================================
{
	var ref_init = $(xmlDoc).attr("ref-init");
	if (ref_init!=undefined) {
		var ref_inits = ref_init.split("/"); // ref1/ref2/...
		for (var i=0;i<ref_inits.length;i++)
			aggregates[ref_inits[i]] = new Array();
	}
	$.ajax({
		type : "GET",
		dataType : "xml",
		url : "../../../"+serverBCK+"/users",
		success : function(data) {
			processUsers(no,xmlDoc,destid,data,line);
		}
	});
}

//==================================
function processUsers(no,xmlDoc,destid,data,line)
//==================================
{
	debugger
	if(typeof UIFactory != 'undefined')
		UIFactory["User"].parse(data);
	var select = $(xmlDoc).attr("select");
	var value = "";
	if (select.indexOf("username=")>-1)
		if (select.indexOf("'")>-1)
			value = select.substring(10,select.length-1);  // inside quote
		else
			value = eval("json.lines["+line+"]."+select.substring(9));
	var condition = false;
	for ( var j = 0; j < UsersActive_list.length; j++) {
		var username = UsersActive_list[j].username_node.text();
		if (select.indexOf("username=")>-1) {
			condition = username.indexOf(value)>-1;
		}
		//------------------------------------
		if (condition){
			userid = UsersActive_list[j].id;
			var children = $(">*",xmlDoc);
			for (var i=0; i<children.length;i++){
				var tagname = $(children[i])[0].tagName;
				if (tagname=="for-each-portfolio")
					getPortfolios(no+"_"+j,children[i],destid,data,line);
				if (tagname=="table")
					processTable(no+"_"+j,children[i],destid,data,line);
				if (tagname=="row")
					processRow(no+"_"+j,children[i],destid,data,line);
				if (tagname=="cell")
					processCell(no+"_"+j,children[i],destid,data,line);
				if (tagname=="node_resource")
					processNodeResource(children[i],destid,data,line);
				if (tagname=="text")
					processText(children[i],destid,data,line);
				if (tagname=="for-each-node")
					processNode(no+"_"+j,children[i],destid,data,line);
			}
		}
			//------------------------------------
	}
}

//==================================
function getPortfolios(no,xmlDoc,destid,data,line)
//==================================
{
	addToken();
	var ref_init = $(xmlDoc).attr("ref-init");
	if (ref_init!=undefined) {
		var ref_inits = ref_init.split("/"); // ref1/ref2/...
		for (var i=0;i<ref_inits.length;i++)
			aggregates[ref_inits[i]] = new Array();
	}
	if (userid==null)
		userid = USER.id;
	
	var url = serverBCK+"/portfolios?active=1&user="+userid;
	console.log("REPORT URL: "+url);
	$.ajax({
		type : "GET",
		dataType : "xml",
		url : url,
		success : function(data) {
			processPortfolios(no,xmlDoc,destid,data,line);
		},
		error: function(data)
		{
			this.success(data.responseText);
			clearToken();
//			processPortfolios(no,xmlDoc,destid,data,line);
		}
	});
}

//==================================
function processPortfolios(no,xmlDoc,destid,data,line)
//==================================
{
	//// Parse portfolio list
	var items = $('portfolio', data);
	var portfolios_list = [];
	for( var i=0; i<items.length; ++i)
	{
		var item = items[i];
		var id = $(item).attr('id');
		var code = $('code', $("asmRoot>asmResource[xsi_type='nodeRes']",item));
		var portfolio_content = {
			'id': id,
			'code_node': code,
		};
		portfolios_list.push(portfolio_content);
	}

	console.log("PARSE DATA: ");
	var select = $(xmlDoc).attr("select");
	var value = "";
	var condition = "";
	var portfolioid = "";
	for ( var j = 0; j < portfolios_list.length; j++) {
		var code = portfolios_list[j].code_node.text();
//		alert(j+"-"+code);
		if (select.indexOf("code*=")>-1) {
			value = select.substring(7,select.length-1);  // inside quote
			condition = code.indexOf(value)>-1;
		}
		if (select.indexOf("code=")>-1) {
			value = select.substring(6,select.length-1);  // inside quote
			condition = code==value;
		}
		//------------------------------------
		if (condition){
			addToken();
			portfolioid = portfolios_list[j].id;
			$.ajax({
				type : "GET",
				dataType : "xml",
				j : j,
				url : serverBCK+"/portfolios/portfolio/" + portfolioid + "?resources=true",
				success : function(data, status, error) {
					parseStructure(data,true);
					var children = $(">*",xmlDoc);
					for (var i=0; i<children.length;i++){
						var tagname = $(children[i])[0].tagName;
						if (tagname=="table")
							processTable(no+"p_"+this.j+"_"+i,children[i],destid,data,line);
						if (tagname=="row")
							processRow(no+"p_"+this.j+"_"+i,children[i],destid,data,line);
						if (tagname=="cell")
							processCell(no+"p_"+this.j+"_"+i,children[i],destid,data,line);
						if (tagname=="node_resource")
							processNodeResource(children[i],destid,data,line);
						if (tagname=="text")
							processText(children[i],destid,data,line);
						if (tagname=="for-each-node")
							processNode(no+"p_"+this.j+"_"+i,children[i],destid,data,line);
					}
				},
				error: function(data, status, error)
				{
					this.success(data.responseText,status,error);
					var t = clearToken();
					if( t < 0 )
					{
						processCB();
					};
				}
			});
		}
			//------------------------------------
	}
}

//==================================
function processNodeResource(xmlDoc,destid,data)
//==================================
{
	var text = "";
	var style = "";
	try {
		var select = $(xmlDoc).attr("select");
		var ref = $(xmlDoc).attr("ref");
		style = $(xmlDoc).attr("style");
		var selector = getSelector(select);
		var node = $(selector.jquery,data);
		if (node.length==0) // try the node itself
			node = $(selector.jquery,data).addBack();
		if (select.substring(0,2)=="..") // node itself
			node = data;
		if (node.length>0 || select.substring(0,1)=="."){
			var nodeid = $(node).attr("id");
			/// FIXME Crash when readon resource
			if (selector.type=='resource')
			{
				text = UICom.structure["ui"][nodeid].resource.getView();
			}
			if (selector.type=='resource code')
				text = UICom.structure["ui"][nodeid].resource.getValue();
			if (selector.type=='node label')
				text = UICom.structure["ui"][nodeid].getLabel();
		}
		if (ref!=undefined && ref!="") {
			if (aggregates[ref]==undefined)
				aggregates[ref] = new Array();
			aggregates[ref][aggregates[ref].length] = text;
		}
	} catch(e){
		debugger
		text = "&mdash;";
	}
	text = "<span>"+text+"</span>";
	$("#"+destid).attr("style",style);
	$("#"+destid).append($(text));
}

//==================================
function processText(xmlDoc,destid,data)
//==================================
{
	var text = $(xmlDoc).text();
	var style = $(xmlDoc).attr("style");
	text = "<span>"+text+"</span>";
	$("#"+destid).attr("style",style);
	$("#"+destid).append($(text));
}

//==================================
function processAggregate(aggregate,destid)
//==================================
{
	var style = $(xmlDoc).attr("style");
	var ref = $(aggregate).attr("ref");
	var type = $(aggregate).attr("type");
	var select = $(aggregate).attr("select");
	var text = "";
	if (type=="sum"){
		var sum = 0;
		for (var i=0;i<aggregates[select].length;i++){
			sum += parseInt(aggregates[select][i]);
		}
		text = sum;
	}
	if (type=="avg"){
		var sum = 0;
		for (var i=0;i<aggregates[select].length;i++){
			sum += parseInt(aggregates[select][i]);
		}
		text = sum/aggregates[select].length;
	}
	if (ref!=undefined && ref!="") {
		if (aggregates[ref]==undefined)
			aggregates[ref] = new Array();
		aggregates[ref][aggregates[ref].length] = text;
	}
	text = "<span>"+text+"</span>";
	$("#"+destid).attr("style",style);
	$("#"+destid).append($(text));
}
//===============================================================
//===============================================================
//===============================================================
//===============================================================

//==================================
function processCode()
//==================================
{
	var model_code = $("#model_code").val();
	getModelAndProcess(model_code);
}

//==================================
function getModelAndPortfolio(model_code,node,destid,g_dashboard_models)
//==================================
{
	console.log("FETCHING ?");
	var xml_model = "";
	$("#wait-window").modal('show');
	$.ajax({
		type : "GET",
		dataType : "xml",
		url : "/"+serverBCK+"/portfolios/portfolio/code/"+model_code,
		success : function(data) {
			console.log("STAGE 1");
			var nodeid = $("asmRoot",data).attr("id");
			// ---- transform karuta portfolio to report model
			var urlS = "/"+serverBCK+"/nodes/"+nodeid+"?xsl-file="+appliname+"/karuta/xsl/karuta2report.xsl&lang="+LANG;
			$.ajax({
				type : "GET",
				dataType : "xml",
				url : urlS,
				success : function(data) {
					console.log("STAGE 2");
					g_dashboard_models[model_code] = data;
					processPortfolio(0,data,destid,node,0);
					$("#wait-window").modal('hide');
				}
			 });
		}
	});
}

//==================================
function getModelAndProcess(model_code,json)
//==================================
{
	$.ajax({
		type : "GET",
		dataType : "xml",
		url : "../../../"+serverBCK+"/portfolios/portfolio/code/"+model_code,
		success : function(data) {
			var nodeid = $("asmRoot",data).attr("id");
			// ---- transform karuta portfolio to report model
			var urlS = "../../../"+serverBCK+"/nodes/"+nodeid+"?xsl-file="+appliname+"/karuta/xsl/karuta2report.xsl&lang="+LANG;
			$.ajax({
				type : "GET",
				dataType : "xml",
				url : urlS,
				success : function(data) {
					process(data,json);
				}
			 });
		}
	});
}

//==================================
function xml2PDF()
//==================================
{
	var data = $('#content').html();
	data = data.replace('&nbsp;', ' ');
	var url =  "../../../"+serverFIL+"/xsl?xsl="+appliname+"/karuta/xsl/html2fo.xsl&format=application/pdf";
	postAndDownload(url,data);
}

//==================================
function displayPDFButton()
//==================================
{
	var html = "<h4 class='line'><span class='badge'>3</span></h4><button onclick='javascript:xml2PDF()''>pdf</button>";
	$("#pdf").html(html);
}

var token = 0;

function addToken()
{
	token = token +1;
	console.log('TOKEN STATE: '+token+' (+)');
	return token;
}

function clearToken()
{
	token = token -1;
	console.log('TOKEN STATE: '+token+' (-)');
	return token;
}


function addRoles(node)
	//=======================================================================
	{
		addRole(node,'seenoderoles');
		addRole(node,'editresroles');
		addRole(node,'delnoderoles');
		addRole(node,'commentnoderoles');
		addRole(node,'submitroles');
		addRole(node,'editnoderoles');
		addRole(node,'shownoderoles');
		addRole(node,'showroles');
		addRole(node,'showtoroles');
		addRole(node,'notifyroles');
		addRole(node,'menuroles');
		addRole(node,'moveroles');
		addRole(node,'resizeroles');
		addRole(node,'edittargetroles');
		addRole(node,'graphicerroles');
		addRole(node,'duplicateroles');
	};
	
	//=======================================================================
function addRole(node,attribute)
	//=======================================================================
	{
		if ($("metadata-wad",node).attr(attribute)!=undefined) {
			try {
				//----------------------------
				var roles = null;
				if (attribute == 'menuroles' && $("metadata-wad",node).attr(attribute) != undefined && $("metadata-wad",node).attr(attribute).length>10) {
					var items = $("metadata-wad",node).attr(attribute).split(";");
					for (var i=0; i<items.length; i++){
						var subitems = items[i].split(",");
						if (subitems[0]!="#line") {
							roles = subitems[3].split(" ");
							//----------------------------
							for (var j=0;j<roles.length;j++){
								if (roles[j]!='all' && roles[j]!='' && roles[j]!='user')
									UICom.roles[roles[j]] = true;
							}
						}
						//----------------------------
					}
				}
				else {
					roles = $("metadata-wad",node).attr(attribute).split(" ");
					//----------------------------
					for (var i=0;i<roles.length;i++){
						if (roles[i]!='all' && roles[i]!='' && roles[j]!='user')
							UICom.roles[roles[i]] = true;
					}
					//----------------------------
				}
			} catch(e) {
				alert('Error role in :'+attribute+"  --"+e); 
			}
		}
	};

function parseNode( n )
{
	var data = {
		id: $(n).attr('id'),
		node: n,
		asmtype: $(n).prop('nodeName'),
		code_node: $($('code',n)[0]),
		userrole: $(n).attr('role'),
		label_node: [],
		resource_type: null,
		resource: null,
	};

	try
	{
		for (var i=0; i<languages.length;i++){
			data.label_node[i] = $("label[lang='"+languages[i]+"']",$("asmResource[xsi_type='nodeRes']",n)[0]);
			if (data.label_node[i].length==0) {
				var newElement = createXmlElement("label");
				$(newElement).attr('lang', languages[i]);
				$("asmResource[xsi_type='nodeRes']",n)[0].appendChild(newElement);
				data.label_node[i] = $("label[lang='"+languages[i]+"']",$("asmResource[xsi_type='nodeRes']",n)[0]);
			}
		}
		var resource = null;
		if (data.asmtype=='asmContext') {
			resource = $("asmResource[xsi_type!='nodeRes'][xsi_type!='context']",n);
			data.resource_type = $(resource).attr("xsi_type");
			/// FIXME different parsing
			data.resource = new UIFactory[data.resource_type](n);
		}
	}
	catch( err )
	{
		debugger;
		console.log("UIFactory['Node']--"+err.message+"--"+data.id+"--"+data.resource_type);
	}

	return data;
};

UICom = {};
UICom.structure = {};
UICom.treeroot = {};
UICom.treerootid = {};
proxies_data = {};
proxies_parent = {};
proxies_nodeid = {};

UIFactory['Field'] = function( node )
{
	this.id = $(node).attr('id');
	this.node = node;
	this.type = 'Field';
	this.text_node = [];
	for (var i=0; i<languages.length;i++){
		this.text_node[i] = $("text[lang='"+languages[i]+"']",$("asmResource[xsi_type='Field']",node));
		if (this.text_node[i].length==0) {
			if (i==0 && $("text",$("asmResource[xsi_type='Field']",node)).length==1) { // for WAD6 imported portfolio
				this.text_node[i] = $("text",$("asmResource[xsi_type='Field']",node));
			} else {
				var newelement = createXmlElement("text");
				$(newelement).attr('lang', languages[i]);
				$("asmResource[xsi_type='Field']",node)[0].appendChild(newelement);
				this.text_node[i] = $("text[lang='"+languages[i]+"']",$("asmResource[xsi_type='Field']",node));
			}
		}
	}
	this.encrypted = ($("metadata",node).attr('encrypted')=='Y') ? true : false;
	this.multilingual = ($("metadata",node).attr('multilingual-resource')=='Y') ? true : false;
	this.display = {};
};

UIFactory['Field'].prototype.getView = function(dest,type,langcode)
{
	if (langcode==null)
		langcode = LANGCODE;
	//---------------------
	this.multilingual = ($("metadata",this.node).attr('multilingual-resource')=='Y') ? true : false;
	if (!this.multilingual)
		langcode = NONMULTILANGCODE;
	//---------------------
	if (dest!=null) {
		this.display[dest] = langcode;
	}
	var html = $(this.text_node[langcode]).text();
	if (this.encrypted)
		html = decrypt(html.substring(3),g_rc4key);
	return html;
};

function Tree(node)
{
	this.node = node;
	this.children = [];
};

///// Added
function parseStructure( data, treeroot, parentid, treerootname )
	{
		if (treeroot==null || treeroot) {
			treeroot = true;
		}
		if( UICom.structure["tree"] == null )
			UICom.structure["tree"] = {};
		if( UICom.structure["ui"] == null )
			UICom.structure["ui"] = {};
		/// ------------------ Get root node
		var root = $("asmRoot", data);
		var name = "asmRoot";
		if (root.length==0) {
			root = $("asmStructure", data);
			name = "asmStructure";
		}
		if (root.length==0){
			root = $("asmUnit", data);
			name = "asmUnit";
		}
		if (root.length==0) {
			root = $("asmUnitStructure", data);
			name = "asmUnitStructure";
		}
		if (root.length==0) {
			root = $("asmContext", data);
		}
		//---------------------
		var id = $(root).attr("id");
		var r = new Tree(root[0]);
		//---------------------
		if (treeroot) {
			UICom.root = r;
			UICom.rootid = id;
			if (treerootname!=null && treerootname!=undefined){
				UICom.treeroot[treerootname] = r;
				UICom.treerootid[treerootname] = id;
			}
		} else {
			if (UICom.structure["tree"][parentid]!=undefined) {
				var push = true;
				for( var i=0; i<UICom.structure["tree"][parentid].children.length; ++i ){
					if (UICom.structure["tree"][parentid].children[i]==id)
						push = false;
				}
				if (push)
					UICom.structure["tree"][parentid].children.push(id);
			}
		}
		//---------------------
		UICom.structure["tree"][id] = r;
		UICom.structure["ui"][id] = parseNode(root);
		parseElement(r);
	};


	//=======================================================================
function parseElement(currentNode)
	//=======================================================================
	{
		if (g_userrole=='designer')
			addRoles(currentNode.node);
		var current = currentNode.node;
		var children = $(current).children();
	
		for( var i=0; i<children.length; ++i ) {
			var child = children[i];
			var name = child.tagName;
			if( "asmRoot" == name || "asmStructure" == name || "asmUnit" == name || "asmUnitStructure" == name || "asmContext" == name ) {
				var id = $(child).attr("id");
				var childTree = new Tree(child);
				currentNode.children.push(id);
				UICom.structure["tree"][id] = childTree;
				UICom.structure["ui"][id] = parseNode(child);
				if (name=='asmContext') {
					resource = $("asmResource[xsi_type!='nodeRes'][xsi_type!='context']",child);
					resource_type = $(resource).attr("xsi_type");
					if (!g_encrypted) {
						g_encrypted = ($("metadata",child).attr('encrypted')=='Y') ? true : false;
					}
					//// FIXME Proxy calls
					if (resource_type=='Proxy') {
						var targetid = $("code",$("asmResource[xsi_type='Proxy']",child)).text();
						var edittargetroles = ($("metadata-wad",child).attr('edittargetroles')==undefined)?'none':$("metadata-wad",child).attr('edittargetroles');
						$.ajax({
							type : "GET",
							dataType : "xml",
							url : "../../../"+serverBCK+"/nodes/node/" + targetid + "?resources=true",
							success : function(data) {
								proxies_data[targetid] = data;
								proxies_parent[targetid] = $(current).attr("id");
								proxies_edit[targetid] = edittargetroles;
								proxies_nodeid[targetid] = id;
								parseStructure(data,false,$(current).attr("id"));
							}
						});
					}
					if (resource_type=='Get_Proxy') {
						var targetid = $("code",$("asmResource[xsi_type='Get_Proxy']",child)).text();
						$.ajax({
							type : "GET",
							dataType : "xml",
							url : "../../../"+serverBCK+"/nodes/node/" + targetid + "?resources=true",
							success : function(data) {
								parseStructure(data,false,$(current).attr("id"));
							},
							error : function(jqxhr,textStatus) {
								alert("Error in parseElement - Get_Proxy : "+jqxhr.responseText);
							}
						});
					}
				} // end of asmContext
				var semtag = $("metadata",child).attr('semantictag');
				if (semtag=='EuropassL'){
					/// FIXME, later
					UIFactory["EuropassL"].parse(child);
				}

				// recurse
				parseElement(childTree);
			}
		}
	};


var processCB = null;

module.exports = 
{
	getModelAndProcess: getModelAndProcess,
	processPortfolios: processPortfolios,
	process: function( code, cb )
	{
		token = 0;
		process(code);
		processCB = cb;
	},
};

