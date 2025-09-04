'use strict';

const debug = true;     // control debug mode
const exampleImages = "qwertyuiopasdfghjklzxcvbnm".split("").map(
    ch => `https://picsum.photos/seed/${ch}/200/200`
);

window.CONFIG = {

    // Experiment Settings
    experiment_name: "RSVP Experiment",
    subj_id_length: 8,              // number of characters (0-9, a-z) to generate a random subject ID
    max_media_load_time: 20000,     // maximum time (ms) to wait for media to preload
    run_example: true,
    show_summary: true,
    debug,

    // Task level
    n_blocks: debug ? 2 : 5,
    block_length: debug ? 3 : 10,   // trials per block
    trial_length: debug ? 5 : 10,   // images per trial
    keys: {                         // key pressess and their meanings
        detect: ' ',
    },

    // Stimulus presentation time (ms) - control how long images are displayed
    stim_ms_min: 200,
    stim_ms_max: 400,

    // Inter-stimulus interval (ms) - control the time between image presentations
    isi_ms_min: 0,
    isi_ms_max: 100,

    // Inter-trial interval (ms) - control the time between trials within a block
    iti_ms_min: 0,
    iti_ms_max: 100,

    // Image URLs
    example_images: exampleImages,
    experiment_images: debug ?
        exampleImages :
        exampleImages,  // Replace with your URLs/paths
};
