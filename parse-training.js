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
    getTaskList(sessionkey).then(taskList=>{
      const dirname = `./output/${Math.floor(Date.now()/1000)}`;
      //fs.mkdirSync("./output/").catch(e=>console.log(e));
      fs.mkdirSync(dirname);
      taskList.forEach((item, i) => {
        parseTaskRequest(item,sessionkey).then(a=>{
          fs.writeFileSync(`${dirname}/${item.id}.json`,JSON.stringify({data:a}));
          console.log('Finished '+item.name)
        }).catch(err=>console.log(`Error parsing/writing tasks: ${err}`));
      });
    })
  }).catch(err=>console.log(err));
})()

async function parseTaskRequest(task, sessionkey){
  var answers = [];

  const cookie = request.cookie(`sessionkey=${sessionkey}`);
  const j = request.jar();
  j.setCookie(cookie,'uztest.ru');

  const taskData = await request.post({url:aurl, form:{sessionkey,job:task.job,id:task.id,action:"openTask"}, jar:j, json:true});
  const items = taskData.data.task.info.items;
  const attempts = taskData.data.attempts;
  let lastAttempt = attempts[attempts.length-1];

  for(let i = 0; i<items; i++){
    const send = await request.post({url:aurl, form:{sessionkey,job:task.job, id:task.id, "answers[0][id]":lastAttempt.id, "answers[0][useranswer]":"amogus1","answers[0][qtype]":lastAttempt.qtype,action:"saveAttempt"}});
    const ans = await request.post({url:aurl, form:{sessionkey, "idattempt":lastAttempt.id,action:"getAttemptHelp"},json:true});
    const next = await request.post({url:aurl, form:{sessionkey, job:task.job, id:task.id, action:"nextAttempt"},json:true});
    lastAttempt=next.data.attempts[0];
    answers.push({"qid":lastAttempt.id,"ans":ans.data.help});

    console.log(`${i+1} of ${items}`\r);
  }
  console.log('');
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
