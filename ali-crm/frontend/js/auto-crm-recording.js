function RecordingEngine(){
  this.status = new RecordingStatus();
  this.settings = new Settings(this.status);
  this.queue = new Queue(this.status);

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
}

RecordingEngine.prototype.addCompanyLoader = function () {
  this.status.addCompanyLoader();
  var companyLoader = new CompanyLoader(this.companyLoaders.length,this.status,this.settings,this.queue);
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
  var customerRecorder = new CustomerRecorder(this.customerRecorders.length,this.status,this.settings,this.queue);
  customerRecorder.onStopped = new CallBack(this,this.onCustomerRecorderStopped)
  this.customerRecorders.push(customerRecorder);
  this.removeCustomerRecorderStatusMap.push(false);
};

RecordingEngine.prototype.removeCustomerRecorder = function () {
  var i = this.customerRecorders.length-1;
  this.removeCustomerRecorderStatusMap[i] = true;
  this.customerRecorders[i].receivedStopSignal = true;
};

RecordingEngine.prototype.start = function () {
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
  this.runningStatus = ko.observable('init');
  this.queueSize = ko.observable(0);
  this.companyLoaders = ko.observableArray();
  this.customerRecorders = ko.observableArray();

  this.activeCompanyLoaderCount = ko.computed(function(){
    this.companyLoaders().reduce(function(a,c){
      return a+(c.active()?1:0);
    },0);
  });

  this.activeCustomerRecorderCount = ko.computed(function(){
    this.customerRecorders().reduce(function(a,c){
      return a+(c.active()?1:0);
    },0);
  });
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
  this.submitTimes(this.submitTimes()+1)；
};

RecordingStatus.prototype.reportQueueSize = function (newSize) {
  this.queueSize(newSize);
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
}

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

function SgsCrawler(status,settings){
  this.status = status;
  this.settings = settings;

  this.crawler = new crawler();
}

SgsCrawler.prototype.next = function (cb) {
  // TODO: use crawler to get next company
};

function CompanyLoader(id,status,settings,queue){
  this.id = id;
  this.status = status;
  this.settings = settings;
  this.queue = queue;

  this.isRunning = false;
  this.receivedStopSignal = false;
  this.onStopped = null;
  this.sgsCrawler = new SgsCrawler(status,settings);
}

CompanyLoader.prototype.start = function () {
  if(this.isRunning){
    this.receivedStopSignal = false;
    return;
  }

  console.info("CompanyLoader["+this.id+"] started.");

  this.isRunning = true;
  this.next();
};

CompanyLoader.prototype.next = function () {
  if(!this.receivedStopSignal && this.status.isRunning() && !this.settings.checkIfLimitExceeded()){
    this.sgsCrawler.next(this.onCrawlerNext);
  }else{
    this.isRunning = false;
    console.info("CompanyLoader["+this.id+"] stopped.");

    if(this.onStopped){
      this.onStopped.call(this);
    }
  }
};

CompanyLoader.prototype.onCrawlerNext = function (companyName,appliedTime) {
  if(companyName){
    console.debug("CompanyLoader["+this.id+"] loaded a new company: "+companyName);

    var company = new Company(companyName,appliedTime);
    this.queue.enque(company);
    ths.status.appendLoadedCompany(company);
  }

  setTimeout(this.next, this.queue.size()*10);
};

function AliCrmCrawler(status,settings){
  this.status = status;
  this.settings = settings;

  this.crawler = new crawler();
}

AliCrmCrawler.prototype.next = function (company,cb) {
  // body...
};

function CustomerRecorder(id,status,settings,queue){
  this.id = id;
  this.status = status;
  this.settings = settings;
  this.queue = queue;

  this.isRunning = false;
  this.receivedStopSignal = false;
  this.onStopped = null;
  this.crmCrawler = new AliCrmCrawler(status,settings);
}

CustomerRecorder.prototype.start = function () {
  if(this.isRunning){
    this.receivedStopSignal = false;
    return;
  }

  console.info("CustomerRecorder["+this.id+"] started");

  this.isRunning = true;
  this.next();
};

CustomerRecorder.prototype.next = function () {
  if(!this.receivedStopSignal && this.status.isRunning()){

    if(!this.currentCompany){
      if(this.queue.size() > 0){
        this.currentCompany = this.queue.deque();
      }else{
        setTimeout(this.next,0);
        return;
      }
    }

    this.status.increaseSubmitTimes();

    if(!this.settings.checkIfLimitExceeded()){
      this.crmCrawler.next(company,this.onCrawlerNext);
      return;
    }
  }

  this.isRunning = false;
  console.info("CustomerRecorder["+this.id+"] stopped");

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
      console.error("Unrecognized submit result("+submitResult+") found. It is always deal to engine logical issues. Stop this engine if necessary.");
      this.currentCompany = null;
      break;
  }

  setTimeout(this.next,100.0/(this.queue.size()+1));
};
