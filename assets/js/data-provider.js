window.DataProvider={
 get(key,fallback=[]){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}},
 set(key,val){localStorage.setItem(key,JSON.stringify(val))}
};