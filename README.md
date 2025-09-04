# MemoryTest
## A `jsPsych` implementation for a visual working memory test.

### Overview
This repository contains a `jsPsych` implementation of a visual working memory test. The test is designed to assess an individual's ability to temporarily store and retrieve images in their working memory. The experiments consists of blocks of trial, where the participant needs to identify a target image presented during a sequence of distractor images.

### Configuration
The experiment can be configured by modifying the `config.js` file. Key parameters include:
- `n_blocks`: Number of blocks in the experiment.
- `block_length`: Number of trials in each block.
- `trial_length`: Number of images in each trial's sequence.
- `experiment_images`: Array of images used in the experiment.

#### Timing Parameters
A special note regarding the different timing variable that can be configured in the experiment: in each block, trials **share** the same timing parameters, which are randomly selected from the ranges specified in `config.js`. The timing parameters include:
- `stim_ms_min` and `stim_ms_max`: Minimum and maximum duration (in milliseconds) for which each image is displayed.
- `isi_ms_min` and `isi_ms_max`: Minimum and maximum inter-stimulus interval (in milliseconds) between images of the same trial.
- `iti_ms_min` and `iti_ms_max`: Minimum and maximum inter-trial interval (in milliseconds) between trials.


## About jsPsych
`jsPsych` is a JavaScript library for creating behavioral experiments that run in a web browser. For more information, visit the [jsPsych website](https://www.jspsych.org/) or check out the [jsPsych GitHub repository](https://github.com/jspsych/jsPsych).
