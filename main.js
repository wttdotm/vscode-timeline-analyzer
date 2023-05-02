#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ... (keep the existing functions: getTimestampsFromEntries, filterFiles, filterTimestampsSince, createWorkingPeriods, logWorkingPeriods)

function getTimestampsFromEntries(entriesFile) {
  const data = JSON.parse(fs.readFileSync(entriesFile, 'utf8'));
  // console.log(data)
  const timestamps = data.entries.map(entry => entry.timestamp).filter(ts => ts !== undefined);
  return timestamps;
}


function filterFiles(entriesFile, stringToMatch) {
  const data = JSON.parse(fs.readFileSync(entriesFile, 'utf8'));
  //can change this logic based on if you want to exclude
  // console.log(data.resource, stringToMatch)
  return data.resource.toUpperCase().includes(stringToMatch.toUpperCase())
}

function filterTimestampsSince(timestamps, dateSince) {
  const dateSinceTimestamp = new Date(dateSince).getTime();
  return timestamps.filter(ts => ts >= dateSinceTimestamp);
}


function createWorkingPeriods(orderedTimeline) {
  const workingPeriods = [];
  let currentPeriod = [];
  const periodThreshold = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

  for (let i = 0; i < orderedTimeline.length; i++) {
    const currentDate = orderedTimeline[i];
    const nextDate = orderedTimeline[i + 1];

    currentPeriod.push(currentDate);

    if (!nextDate || new Date(nextDate) - new Date(currentDate) > periodThreshold) {
      workingPeriods.push(currentPeriod);
      currentPeriod = [];
    }
  }

  return workingPeriods;
}


function logWorkingPeriods(workingPeriods, relevantProject) {
  let totalHours = 0
  const aggregatedPeriods = {};

  workingPeriods.forEach(period => {
    const startDate = new Date(period[0]);
    const endDate = new Date(period[period.length - 1]);
    const durationMs = endDate - startDate;
    const durationHours = durationMs / (60 * 60 * 1000);
    const dateStr = startDate.toISOString().substring(0, 10);
    totalHours += durationHours
    if (aggregatedPeriods[dateStr]) {
      aggregatedPeriods[dateStr] += durationHours;
    } else {
      aggregatedPeriods[dateStr] = durationHours;
    }
  });

  console.log(`\n\nHours worked (${relevantProject})`);
  console.log('---------------------');
  
  for (const dateStr in aggregatedPeriods) {
    const durationHours = aggregatedPeriods[dateStr];
    console.log(`${durationHours.toFixed(1)} hours - ${dateStr}`);
  }
  console.log('---------------------');
  console.log(`${totalHours.toFixed(1)} hours - Total`, )
}




function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function main() {
  console.log('\n------------------------------------------------------------------');
  console.log('Welcome to the VSCode Timeline Analyzer!');
  console.log('Use this tool to figure out how much you worked on a given project');
  console.log('------------------------------------------------------------------');

  const defaultHistoryFolder = path.join(process.env.HOME, 'Library/Application Support/Code/User/History');
  const historyFolder = await askQuestion(`\nWhat is the absolute path to your VSCode user history folder? \nPress enter to default to '${defaultHistoryFolder}'\n> `) || defaultHistoryFolder;

  const defaultRelevantProject = path.basename(process.cwd());
  const relevantProject = await askQuestion(`\nWhat is the folder name or file you are trying to analyze? Note: Case insensitive. \nPress enter to default to the name of the current directory: '${defaultRelevantProject}'\n> `) || defaultRelevantProject;

  const defaultDateSince = '6/9/2000';
  const dateSince = await askQuestion(`\nWhen do you want to start analyzing it from in MM/DD/YYYY format? \nPress enter to default to '${defaultDateSince}'\n> `) || defaultDateSince;

  let allTimestamps = [];

  fs.readdirSync(historyFolder).forEach(subfolder => {
    const entriesFile = path.join(historyFolder, subfolder, 'entries.json');
    if (fs.existsSync(entriesFile)) {
      if (filterFiles(entriesFile, relevantProject)) {
        const timestamps = getTimestampsFromEntries(entriesFile);
        const filteredTimestamps = filterTimestampsSince(timestamps, dateSince);
        allTimestamps = allTimestamps.concat(filteredTimestamps);
      }
    }
  });

  allTimestamps.sort((a, b) => a - b);
  const orderedTimeline = allTimestamps.map(ts => new Date(ts).toISOString().replace('T', ' ').substring(0, 19));

  const workingPeriods = createWorkingPeriods(orderedTimeline);
  logWorkingPeriods(workingPeriods, relevantProject);

  console.log('\n\n-----------------------------------------------------------------');
  console.log('Contribute at https://github.com/wttdotm/vscode-timeline-analyzer');
  console.log('- @wttdotm');
  console.log('-----------------------------------------------------------------\n\n');
}

main();