function invoke(obj,method,delay){
  return setTimeout(method.bind(obj),delay || 0);
}
