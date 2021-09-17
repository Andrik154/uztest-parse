const request = require('request-promise-native');
const fs = require('fs');
const de = require('dotenv').config({path:"./cfg.env"})

const credentials = {
  login:process.env.login,
  password:process.env.password
};
const aurl = "https://uztest.ru/student.pl";

//main
(async()=>{
  authorize(credentials).then(sessionkey=>{
    console.log(`Authorized; sessionkey ${sessionkey}`);
    getTaskList(sessionkey).then(taskList=>{
      console.log(`Got tasklist; ${taskList.length} items`);
      const dirname = `./output/${Math.floor(Date.now()/1000)}`;
      //fs.mkdirSync("./output/").catch(e=>console.log(e));
      fs.mkdirSync(dirname);
      parseTaskList(taskList, sessionkey, credentials, dirname).then(()=>{
        console.log(`Job done. Exiting...`);
        process.exit();
      }).catch(err=>console.log(`Error parsing tasklist: ${err}`));
    });
  }).catch(err=>console.log(err));
})()

async function parseTaskList(taskList, sessionkey, credentials, dirname){
  var promiseArr = []
  for(let item of taskList){
    promiseArr.push(new Promise((resolve,reject)=>{
      parseTaskRequest(item,sessionkey,credentials).then(a=>{
        fs.writeFileSync(`${dirname}/${item.id}.json`,JSON.stringify({name: item.name, id: item.id, items: parseInt(item.info.items), done: a.length, data:a}));
        console.log('Finished '+item.name);
        resolve();
      }).catch(err=>{
        console.log(`Error parsing/writing: ${err}`);
        reject();
      });
    }));
  }
  await Promise.allSettled(promiseArr);
}

async function parseTaskRequest(task, sessionkey, credentials){
  var answers = [];

  const cookie = request.cookie(`sessionkey=${sessionkey}`);
  const j = request.jar();
  j.setCookie(cookie,'uztest.ru');

  const taskData = await request.post({url:aurl, form:{sessionkey,job:task.job,id:task.id,action:"openTask"}, jar:j, json:true});
  const items = taskData.data.task.info.items;
  const attempts = taskData.data.attempts;
  let lastAttempt = attempts[attempts.length-1];

  for(let i = 0; i<items; i++){
    try {
      if(lastAttempt.qtype=="multichoice"){
        const send = await request.post({url:aurl, form:{sessionkey,job:task.job, id:task.id, "answers[0][id]":lastAttempt.id, "answers[0][useranswer]":"5799254444553","answers[0][choice][0][idchoice]":"5799254444553","answers[0][qtype]":lastAttempt.qtype,action:"saveAttempt"}});
      } else if (lastAttempt.qtype=="multicheck"){
        const send = await request.post({url:aurl, form:{sessionkey,job:task.job, id:task.id, "answers[0][id]":lastAttempt.id, "answers[0][useranswer]":"2991645184003,2111629128461","answers[0][choice][0][idchoice]":"2991645184003","answers[0][choice][1][idchoice]":"2111629128461","answers[0][qtype]":lastAttempt.qtype,action:"saveAttempt"}});
      } else {
        const send = await request.post({url:aurl, form:{sessionkey,job:task.job, id:task.id, "answers[0][id]":lastAttempt.id, "answers[0][useranswer]":"amogus1","answers[0][qtype]":lastAttempt.qtype,action:"saveAttempt"}});
      }
      const ans = await request.post({url:aurl, form:{sessionkey, "idattempt":lastAttempt.id,action:"getAttemptHelp"},json:true});
      const next = await request.post({url:aurl, form:{sessionkey, job:task.job, id:task.id, action:"nextAttempt"},json:true});
      answers.push({"qid":lastAttempt.id,"ans":ans.data.help});

      lastAttempt=next.data.attempts[0];

      process.stdout.write('\33[2K'+`${task.name}: ${i+1} of ${items}\n`);
    } catch (e) {
      console.log(`Error happened during parsing; trying to get new sessionkey\nError: ${e}`);
      sessionkey = await authorize(credentials);
      i--;
    }
  }
  process.stdout.write('\n');
  return answers;
}

async function getTaskList(sessionkey){
  const r = await request.post({url:'https://uztest.ru/student.pl', form:{sessionkey:sessionkey,action:'getTaskList',json:true}});
  if (r.status='OK'){
    return JSON.parse(r).data.tasklist;
  } else {
    throw new Error('something bad with fetching a task list');
  }
}

//returns sessionkey
async function authorize(credentials){
  const r = await request.post({url:'https://uztest.ru/student.pl', form:{login:credentials.login,password:credentials.password,action:"signIn"}, headers:{'accept':'application/json'}, json:true});
  if (r.status = 'OK'){
    return r.data.sessionkey;
  } else {
    throw new Error('smthng bad with auth');
  }
}
