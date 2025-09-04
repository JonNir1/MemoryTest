'use strict';

function runExperiment() {
    if (!window.CONFIG) {
        throw new Error("CONFIG not found. Load config.js before experiment.js");
    }
    const cnfg = window.CONFIG;
    const jsPsych = initJsPsych({
        on_finish: () => { cnfg.debug ? jsPsych.data.displayData() : null; }
    });
    const subjID = jsPsych.randomization.randomID(cnfg.subj_id_length);
    jsPsych.data.addProperties({ subject_id: subjID });
    jsPsych.randomization.setSeed(subjID);
    jsPsych.data.addProperties({ start_time: new Date().toISOString() });

    const detectKey = (cnfg.keys && cnfg.keys.detect) || ' ';
    const detectKeyName = detectKey === ' ' ? '<kbd>SPACE</kbd>' : `<kbd>${detectKey}</kbd>`;
    const targetText = cnfg.target_text ||
        `<p>Memorize the target.</p>
        <p>Press ${detectKeyName} to continue.</p>`;
    var timeline = [];

    const expStart = startExperiment(cnfg, detectKeyName);
    timeline.push(expStart);
    if (cnfg.run_example) {
        const example = makeExample(jsPsych, cnfg, detectKey, targetText);
        timeline.push(example);
    }
    for (let b = 0; b < cnfg.n_blocks; b++) {
        const block = makeBlock(jsPsych, cnfg, b, detectKey, targetText);
        timeline.push(block);
    }
    if (cnfg.show_summary) {
        const summary = makeSummaryScreen(jsPsych);
        timeline.push(summary);
    }
    jsPsych.run(timeline);
}


function startExperiment(cnfg, detectKeyName) {
    var startTimeline = [];
    const welcomeScreen = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
        <div style="max-width:720px;margin:40px auto;line-height:1.5">
        <h2>Welcome to the Experiment!</h2>
        <p>Press any key to begin.</p>
      </div>
      `,
    };
    startTimeline.push(welcomeScreen);
    const maxLoadTime = cnfg.max_media_load_time || 20000;
    const prepScreen = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
        <div style="max-width:720px;margin:40px auto;line-height:1.5">
        <p>The experiment requires some initial preparation.</p>
        <p>This may take up to ${(maxLoadTime / 1000).toFixed(1)} seconds.</p>
        <p>Don't worry if the screen looks still - materials are loading in the background.</p>
        <p>Press any key to start the preparation.</p>
        </div>
        `,
    };
    startTimeline.push(prepScreen);
    const preloadImages = {
        type: jsPsychPreload,
        images: cnfg.experiment_images,
        max_load_time: maxLoadTime,
    };
    startTimeline.push(preloadImages);
    const instructionsScreen = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
        <div style="max-width:720px;margin:40px auto;line-height:1.5">
        <h2>Instructions</h2>
        <p>You will first see a <b>target image</b>. Memorize it, then press ${detectKeyName}.</p>
        <p>Next, a sequence of images will play. Press ${detectKeyName} as soon as the target image appears.</p>
        <p>Press any key to continue.</p>
      </div>
      `,
    };
    startTimeline.push(instructionsScreen);
    return { timeline: startTimeline };
}


function makeExample(jspsych, cnfg, detectKey, targetText) {
    var exampleTimeline = [];
    const exampleScreen = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
        <div style="max-width:720px;margin:40px auto;line-height:1.5">
        <h2>Example Block</h2>
        <p>Press any key to continue.</p>
      </div>
      `,
    };
    exampleTimeline.push(exampleScreen);
    const images = cnfg.example_images;
    const preloadExampleImages = {
        type: jsPsychPreload,
        images: images,
        max_load_time: 1000,
    };
    exampleTimeline.push(preloadExampleImages);
    const nTrials = 3;
    for (let i = 1; i <= nTrials; i++) {
        const trial = {
            type: jsPsychImageStreamKeyboardResponse,
            block_num: -1,
            trial_num: i,
            images_pool: images,
            stream_length: 5,
            stim_ms: 250,
            isi_ms: 50,
            detect_key: detectKey,
            target_text: targetText,
        };
        exampleTimeline.push(trial);
    }
    const exampleCompletedScreen = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function () {
            const exampleData = jspsych.data.get().last(nTrials);
            const nCorrect = exampleData.filter({ correct: true }).count();
            return `
            <div style="max-width:720px;margin:40px auto;line-height:1.5">
            <h2>Example Block Completed</h2>
            <p>You completed ${nTrials} trials.</p>
            <p>You identified the target image correctly ${nCorrect} times.</p>
            <p>Press any key to continue.</p>
            </div>
            `;
        }
    };
    exampleTimeline.push(exampleCompletedScreen);
    return { timeline: exampleTimeline };
}


function makeBlock(jspsych, cnfg, blockNum, detectKey, targetText) {
    const stim_ms = jspsych.randomization.randomInt(cnfg.stim_ms_min, cnfg.stim_ms_max);
    const isi_ms = jspsych.randomization.randomInt(cnfg.isi_ms_min, cnfg.isi_ms_max);
    const iti_ms = jspsych.randomization.randomInt(cnfg.iti_ms_min, cnfg.iti_ms_max);
    const images = jspsych.randomization.shuffle(cnfg.experiment_images);
    var blockTimeline = [];
    for (let i = 0; i < cnfg.block_length; i++) {
        const trial = {
            type: jsPsychImageStreamKeyboardResponse,
            block_num: blockNum,
            trial_num: i + 1,
            images_pool: images,
            stream_length: cnfg.trial_length,
            detect_key: detectKey,
            target_text: targetText,
            stim_ms,
            isi_ms,
        };
        blockTimeline.push(trial);
        const iti = {
            type: jsPsychHtmlKeyboardResponse,
            stimulus: '',
            choices: "NO_KEYS",
            trial_duration: iti_ms,
        };
        blockTimeline.push(iti);
    }
    return { timeline: blockTimeline };
}

function makeSummaryScreen(jspsych) {
    const allTrials = jspsych.data.get().filterCustom(trl => {
        return trl.block_num != null && trl.block_num >= 0;
    });
    const nTrials = allTrials.count();
    const nCorrect = allTrials.filter({ correct: true }).count();
    const hitRate = nTrials > 0 ? (nCorrect / nTrials) * 100 : 0;
    const summaryScreen = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `
        <div style="max-width:720px;margin:40px auto;line-height:1.5">
        <h2>All done!</h2>
        <p>You correctly identified ${nCorrect} out of ${nTrials} targets (${hitRate.toFixed(2)}%).</p>
        <p>Thank you for participating.</p>
        </div>
        `,
    };
    return { timeline: [summaryScreen] };
}
