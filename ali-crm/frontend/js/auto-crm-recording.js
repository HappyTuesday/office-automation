function RecordingEngine(){
  this.status = new RecordingStatus();
  this.settings = new Settings(this.status);
  this.settings.onloaded = new CallBack(this,this.settingInitialized);
}

RecordingEngine.prototype.initialize = function () {
  this.initialized = false;
  this.settings.load("../data/settings.auto-crm-recording.json");
};

RecordingEngine.prototype.addCompanyLoader = function () {
  this.status.addCompanyLoader();
  var companyLoader = new CompanyLoader(this.companyLoaders.length,this.status,this.settings,this.queue,this.sgsCriteriaProvider);
  companyLoader.onStopped = new CallBack(this,this.onCompanyLoaderStopped);
  this.companyLoaders.push(companyLoader);
  this.removeCompanyLoaderStatusMap.push(false);
};

RecordingEngine.prototype.removeCompanyLoader = function () {
  var i = this.companyLoaders.length-1;
  this.removeCompanyLoaderStatusMap[i] = true;
  this.companyLoaders[i].receivedStopSignal = true;
};

RecordingEngine.prototype.addCustomerRecorder = function () {
  this.status.addCustomerRecorder();
  var customerRecorder = new CustomerRecorder(this.customerRecorders.length,this.status,this.settings,this.queue,this.recordingHistory);
  customerRecorder.onStopped = new CallBack(this,this.onCustomerRecorderStopped)
  this.customerRecorders.push(customerRecorder);
  this.removeCustomerRecorderStatusMap.push(false);
};

RecordingEngine.prototype.removeCustomerRecorder = function () {
  var i = this.customerRecorders.length-1;
  this.removeCustomerRecorderStatusMap[i] = true;
  this.customerRecorders[i].receivedStopSignal = true;
};

RecordingEngine.prototype.settingInitialized = function () {
  this.queue = new Queue(this.status);

  this.sgsCriteriaProvider = new SgsCriteriaProvider(this.settings);
  this.sgsCriteriaProvider.prepare();

  this.recordingHistory = new CustomerRecordingHistory(this.settings);

  this.companyLoaders = [];
  this.removeCompanyLoaderStatusMap = [];
  for(var i = 0;i < this.settings.initCompanyLoaderCount;i++){
    this.addCompanyLoader();
  }

  this.customerRecorders = [];
  this.removeCustomerRecorderStatusMap = [];
  for(var i = 0;i < this.settings.initCustomerRecorderCount;i++){
    this.addCustomerRecorder();
  }

  this.initialized = true;
};

RecordingEngine.prototype.start = function () {
  if(!this.initialized){
    this.status.error("Engine has not be initialized.");
    return;
  }

  for(var i=0;i<this.companyLoaders.length;i++){
    var companyLoader = this.companyLoaders[i];
    if(companyLoader){
      companyloader.start();
      this.status.changeCompanyLoaderStatus(i,true);
    }
  }

  for(var i=0;i<this.customerRecorders.length;i++){
    var customerRecorder = this.customerRecorders[i];
    if(customerRecorder){
      customerRecorder.start();
      this.status.changeCustomerRecorderStatus(i,true);
    }
  }
};

RecordingEngine.prototype.stop = function () {
  if(!this.initialized){
    this.status.error("Engine has not be initialized.");
    return;
  }

  for(var i=0;i<this.companyLoaders.length;i++){
    var companyLoader = this.companyLoaders[i];
    if(companyLoader){
      companyloader.receivedStopSignal = true;
    }
  }

  for(var i=0;i<this.customerRecorders.length;i++){
    var customerRecorder = this.customerRecorders[i];
    if(customerRecorder){
      customerRecorder.receivedStopSignal = true;
    }
  }
};

RecordingEngine.prototype.onCompanyLoaderStopped = function (companyLoader) {
  var i = companyLoader.id;
  this.status.changeCompanyLoaderStatus(i,false);
  if(this.removeCompanyLoaderStatusMap[i]){
    this.status.removeCompanyLoader(i);
    this.removeCompanyLoaderStatusMap[i] = null;
    this.companyLoaders[i] = null;
  }
};

RecordingEngine.prototype.onCustomerRecorderStopped = function (customerRecorder) {
  var i = customerRecorder.id;
  this.status.changeCustomerRecorderStatus(i);
  if(this.removeCustomerRecorderStatusMap[i]){
    this.status.removeCustomerRecorder(i);
    this.removeCustomerRecorderStatusMap[i] = null;
    this.customerRecorders[i] = null;
  }
};

function RecordingStatus(){
  this.loadedCompanies = ko.observableArray();
  this.recordedCompanies = ko.observableArray();
  this.duplicatedCompanies = ko.observableArray();
  this.submitTimes = ko.observable(0);
  this.runningStatus = ko.observable('none');
  this.queueSize = ko.observable(0);
  this.companyLoaders = ko.observableArray();
  this.customerRecorders = ko.observableArray();
  this.logs = ko.observableArray();
  this.errors = ko.observableArray();

  this.activeCompanyLoaderCount = ko.computed(function(){
    this.companyLoaders().reduce(function(a,c){
      return a+(c.active()?1:0);
    },0);
  },this);

  this.activeCustomerRecorderCount = ko.computed(function(){
    this.customerRecorders().reduce(function(a,c){
      return a+(c.active()?1:0);
    },0);
  },this);
}

RecordingStatus.prototype.appendLoadedCompany = function (company) {
  this.loadedCompanies.push(company);
};

RecordingStatus.prototype.appendRecordedCompany = function (company) {
  this.recordedCompanies.push(company);
};

RecordingStatus.prototype.appendDuplicatedCompany = function (company) {
  this.duplicatedCompanies.push(company);
};

RecordingStatus.prototype.addCompanyLoader = function () {
  this.companyLoaders.push({
    id: this.companyLoaders().length,
    active: ko.observable(true),
    running: ko.observable(false)
  });
};

RecordingStatus.prototype.changeCompanyLoaderStatus = function (index,isrunning) {
  this.companyLoaders()[index].running(isrunning);
};

RecordingStatus.prototype.removeCompanyLoader = function (index) {
  var companyLoader = this.companyLoaders()[index];
  companyLoader.active(false);
  companyLoader.running(false);
};

RecordingStatus.prototype.addCustomerRecorder = function () {
  this.customerRecorders.push({
    id: this.customerRecorders().length,
    active: ko.observable(true),
    running: ko.observable(false)
  });
};

RecordingStatus.prototype.changeCustomerRecorderStatus = function (index,isrunning) {
  this.customerRecorders()[index].running(isrunning);
};

RecordingStatus.prototype.removeCustomerRecorder = function (index) {
  var customerRecorder = this.customerRecorders()[index];
  customerRecorder.active(false);
  customerRecorder.running(false);
};

RecordingStatus.prototype.setSubmitTimes = function (newValue) {
  this.submitTimes(newValue);
};

RecordingStatus.prototype.increaseSubmitTimes = function () {
  this.submitTimes(this.submitTimes()+1);
};

RecordingStatus.prototype.reportQueueSize = function (newSize) {
  this.queueSize(newSize);
};

RecordingStatus.prototype.initializing = function () {
  this.runningStatus('initializing');
};

RecordingStatus.prototype.initialized = function () {
  this.runningStatus('initialized');
};

RecordingStatus.prototype.isInitialized = function () {
  return ['none','initializing'].indexOf(this.runningStatus()) < 0;
};

RecordingStatus.prototype.start = function () {
  this.runningStatus('running');
};

RecordingStatus.prototype.stop = function () {
  this.runningStatus('stopped');
};

RecordingStatus.prototype.isRunning = function () {
  return this.runningStatus() == 'running';
};

RecordingStatus.prototype.log = function (message) {
  this.logs.push(message);
};

RecordingStatus.prototype.error = function (message) {
  this.errors.push(message);
};

function Queue(status){
  this.status = status;

  this.array = [];
}

Queue.prototype.enque = function (item) {
  this.array.push(item);

  this.status.reportQueueSize(this.array.length);
};

Queue.prototype.deque = function () {
  var item = this.array.unshift();

  this.status.reportQueueSize(this.array.length);

  return item;
};

Queue.prototype.size = function () {
  return this.array.length;
};

function CallBack(obj,method) {
  this.obj = obj;
  this.method = method;
}

CallBack.prototype.call = function () {
  this.method.apply(this.obj,Arguments);
};

function Company(name,appliedTime){
  this.name = name;
  this.appliedTime = appliedTime;
}

function Settings(status){
  this.status = status;

  this.onloaded = null;
}

Settings.prototype.load = function (settingsUrl) {
  this.status.initializing();
  $.ajax({
    url: settingsUrl,
    type: 'GET',
    dataType: 'json',
    context: this,
    success: this.loaded,
    error: function(res){
      this.status.error("Error ocurred while loading settings from server. " + res.toString());
    }
  });
};

Settings.prototype.loaded = function (data) {
  for(var p in data){
    this[p] = data[p];
  }

  this.status.initialized();
  if(this.onloaded){
    this.onloaded.call();
  }
};

Settings.prototype.checkIfLimitExceeded = function () {
  return this.status.submitTimes > this.submitTimesLimit;
};

function Crawler(iframe){
  this.iframe = iframe;

  this.onready = null;
  this.navigated = false;
  this.queryContext = $(this.iframe.document);

  $(this.iframe).onload(this.onload);
}

Crawler.prototype.navigate = function (url) {
  this.navigated = true;
  $(this.iframe).attr('src',url);
};

Crawler.prototype.onload = function () {
  if(this.onready && this.navigated){
    this.navigated = false;
    this.onready.call();
  }
};

function SgsCrawler(id,status,settings,sgsCriteriaProvider){
  this.id = id;
  this.status = status;
  this.settings = settings;
  this.sgsCriteriaProvider = sgsCriteriaProvider;

  this.mode = 'idle';
  this.cb = null;
  this.buffer = [];
  this.crawler = new crawler($('#iframes_sgs #iframe_sgs_'+this.id));
  this.crawler.onready = new CallBack(this,this.iterate);
}

SgsCrawler.prototype.next = function (cb) {
  this.cb = cb;
  this.iterate();
};

SgsCrawler.prototype.iterate = function () {
  if(this.buffer.length > 0){
    var head = [];
    for(var i=0;i<10 && this.buffer.length>0;i++){
      head.push(this.buffer.unshift());
    }
    cb.call(head);
    return;
  }

  switch (this.mode) {
    case 'idle':
      this.mode = 'fill-form';
      this.crawler.navigate(this.settings.sgsUrl);
      break;
    case 'fill-form':
      this.mode = 'retrieve-data';
      if(!this.fillForm()){
        cb.call();
        return;
      }
      this.submit();
      break;
    case 'retrieve-data':
      this.mode = 'next-page';
      this.retrieve();
      invoke(this,iterate);
      break;
    case 'next-page':
      if(this.nextPage()){
        this.mode = 'retrieve-data';
      }else{
        this.mode = 'fill-form';
        invoke(this,iterate);
      }
      break;
    default:
      this.status.error("Entering an error mode "+this.mode);
      break;
  }
};

SgsCrawler.prototype.fillForm = function () {
  this.criteria = this.sgsCriteriaProvider.dispatchCriteria();
  if(!this.criteria){
    return false;
  }

  var form = $('form[name=nameSanctionForm]',this.crawler.queryContext);
  var organOption = $('#acceptOrgan',form).find('option[text="'+this.criteria.organ+'"]');
  if(organOption.length == 0){
    this.status.error("Invalid Organ: ("+this.criteria.organ+")");
    organOption = $('#acceptOrgan',form).find('option:nth-child(2)');
  }

  organOption.attr('selected',true);

  $('#checkName',form).val(this.criteria.key);
  $('#startDate',form).val(this.criteria.date);
  $('#endDate',form).val(this.criteria.date);

  return true;
};

SgsCrawler.prototype.nextPage = function () {
  var pageNext = $('.page_table a[href^="javascript:go"]:contains("下一页")',this.crawler.queryContext)
  if(pageNext.length > 0){
    pageNext.click();
    return true;
  }else{
    return false;
  }
};

SgsCrawler.prototype.submit = function () {
  $('#submitImg',this.crawler.queryContext).click();
};

SgsCrawler.prototype.retrieve = function () {
  $('.tgList tr:not(:first)',this.crawler.queryContext).map(function(i,tr){
    return new Company($('td:nth-child(2)',tr).text(),$('td:nth-child(1)',tr).text());
  });
};

function SgsCriteriaProvider(settings){
  this.settings = settings;
  this.prepare();
}

SgsCriteriaProvider.prototype.prepare = function () {
  this.criteriaQueue = [];
  var now = new Date();
  for(var i=0;i<this.settings.sgsSearchInPastDays;i++){
    var date = new Date(now.getTime() - i*24*3600*1000);
    var dateString = date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();

    for(var j=0;j<this.settings.sgsSearchOrgans.length;j++){
      var organ = this.settings.sgsSearchOrgans[j];

      for(var k=0;k<this.settings.sgsSearchKeywords.length;k++){
        var key = this.settings.sgsSearchKeywords[k];

        this.criteriaQueue.push({
          date: dateString,
          organ: organ,
          key: key
        });
      }
    }
  }
};

SgsCriteriaProvider.prototype.dispatchCriteria = function () {
  if(this.criteriaQueue.length > 0){
    return this.criteriaQueue.unshift();
  }
};

function CustomerRecordingHistory(settings){
  this.settings = settings;
  this.data = [];
}

CustomerRecordingHistory.prototype.appendHistory = function (companyName) {
  this.data.push(companyName);
};

CustomerRecordingHistory.prototype.checkIfDuplicate = function (companyName) {
  return this.data.indexOf(companyName) >= 0;
};

function CompanyLoader(id,status,settings,queue,sgsCriteriaProvider){
  this.id = id;
  this.status = status;
  this.settings = settings;
  this.queue = queue;

  this.isRunning = false;
  this.receivedStopSignal = false;
  this.onStopped = null;
  this.sgsCrawler = new SgsCrawler(id,status,settings,sgsCriteriaProvider);
}

CompanyLoader.prototype.start = function () {
  if(this.isRunning){
    this.receivedStopSignal = false;
    return;
  }

  this.status.log("CompanyLoader["+this.id+"] started.");

  this.isRunning = true;
  this.next();
};

CompanyLoader.prototype.next = function () {
  if(!this.receivedStopSignal && this.status.isRunning() && !this.settings.checkIfLimitExceeded()){
    this.sgsCrawler.next(this.onCrawlerNext);
  }else{
    this.isRunning = false;
    this.status.log("CompanyLoader["+this.id+"] stopped.");

    if(this.onStopped){
      this.onStopped.call(this);
    }
  }
};

CompanyLoader.prototype.onCrawlerNext = function (companies) {
  if(companies){
    for(var i=0;i<companies.length;i++){
      var company = companies[i];

      console.debug("CompanyLoader["+this.id+"] loaded a new company: "+company.name);

      this.queue.enque(company);
      ths.status.appendLoadedCompany(company);

      setTimeout(this.next, this.queue.size()*10);
    }
  }else{
    this.isRunning = false;
    this.status.log("CompanyLoader["+this.id+"] stopped.");

    if(this.onStopped){
      this.onStopped.call(this);
    }
  }
};

function AliCrmCrawler(id,status,settings){
  this.id = id;
  this.status = status;
  this.settings = settings;

  this.crawler = new crawler($('#iframes_crm #iframe_crm_'+id));
}

AliCrmCrawler.prototype.next = function (company,cb) {
  if(this.settings.noop){
    this.status.log("Company ("+company.name+") is recorded in noop mode");
  }else{
    // TODO:...
  }
};

function CustomerRecorder(id,status,settings,queue,recordingHistory){
  this.id = id;
  this.status = status;
  this.settings = settings;
  this.queue = queue;
  this.recordingHistory = recordingHistory;

  this.isRunning = false;
  this.receivedStopSignal = false;
  this.onStopped = null;
  this.crmCrawler = new AliCrmCrawler(id,status,settings);
}

CustomerRecorder.prototype.start = function () {
  if(this.isRunning){
    this.receivedStopSignal = false;
    return;
  }

  this.status.log("CustomerRecorder["+this.id+"] started");

  this.isRunning = true;
  this.next();
};

CustomerRecorder.prototype.next = function () {
  if(!this.receivedStopSignal && this.status.isRunning()){

    if(!this.currentCompany){
      while(this.queue.size() > 0){
        var c = this.queue.deque();
        if(!this.recordingHistory.checkIfDuplicate(c.name)){
          this.currentCompany = c;
          break;
        }
      }
      if(!this.currentCompany){
        invoke(this,this.next);
        return;
      }
    }

    this.status.increaseSubmitTimes();

    if(!this.settings.checkIfLimitExceeded()){
      this.recordingHistory.appendHistory(this.currentCompany.name);
      this.crmCrawler.next(this.currentCompany,this.onCrawlerNext);
      return;
    }
  }

  this.isRunning = false;
  this.status.log("CustomerRecorder["+this.id+"] stopped");

  if(this.onStopped){
    this.onStopped.call(this);
  }
};

CustomerRecorder.prototype.onCrawlerNext = function (submitResult) {
  console.debug("CustomerRecorder["+this.id+"] submited company("+this.currentCompany.name+") with result "+submitResult+" received.");

  switch (submitResult) {
    case 'ok':
      this.status.appendRecordedCompany(this.currentCompany);
      this.currentCompany = null;
      break;
    case 'duplicate':
      this.status.appendDuplicatedCompany(this.currentCompany);
      this.currentCompany = null;
    case 'network_error':
      break;
    default:
      this.status.error("Unrecognized submit result("+submitResult+") found. It is always deal to engine logical issues. Stop this engine if necessary.");
      this.currentCompany = null;
      break;
  }

  invoke(this,this.next,100.0/(this.queue.size()+1));
};

var engine = new RecordingEngine();

var viewModel = {
  engine: engine,
  status: engine.status,
  settings: engine.settings,
};

ko.applyBindings(viewModel);
