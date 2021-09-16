let sessionkey = "g1J1NvUOHSEyQzMDwoIu";
let id = "3783087";
let action = "getAttemptHelp";

let fd = new FormData();
fd.append('sessionkey', sessionkey);
fd.append('idattempt',id);
fd.append('action',action);

fetch('https://uztest.ru/student.pl',{
  method:'POST',
  body: fd
}).then(r=>r.json()).then(d=>console.log(d));
