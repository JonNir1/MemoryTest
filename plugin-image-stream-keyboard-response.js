var jsPsychImageStreamKeyboardResponse = (function (jspsych) {
    'use strict';

    var version = "1.0.0";

    const info = {
        name: "image-stream-keyboard-response",
        version,

        parameters: {
            /**
             * Block number for this trial (for bookkeeping).
             */
            block_num: { type: jspsych.ParameterType.INT, default: null },

            /**
             * Trial number within block (for bookkeeping).
             */
            trial_num: { type: jspsych.ParameterType.INT, default: null },

            /**
             * The pool of images to sample from.
             */
            images_pool: { type: jspsych.ParameterType.COMPLEX, default: null },

            /**
             * number of images in the stream
             */
            stream_length: { type: jspsych.ParameterType.INT, default: null },

            /**
             * The duration (in ms) for which each image is displayed and input is collected.
             * This is a fixed duration for all images in the stream.
             */
            stim_ms: { type: jspsych.ParameterType.INT, default: null },

            /**
             * The ISI - duration between image presentations (in ms).
             */
            isi_ms: { type: jspsych.ParameterType.INT, default: null },

            /**
             * Key to press when the target image is detected.
             */
            detect_key: { type: jspsych.ParameterType.STRING, default: null },

            /**
             * Text to show below the target image during the encoding phase.
             * Keep empty for no prompt.
             */
            target_text: { type: jspsych.ParameterType.HTML_STRING, default: null },

            /**
             * Rendering options - controlling the display size of images.
             * For more information on rendering options, please refer to the documentation of
             * jsPsych plugin image-keyboard-response image-keyboard-response.
             */
            render_on_canvas: { type: jspsych.ParameterType.BOOL, default: true },
            stimulus_height: { type: jspsych.ParameterType.INT, default: null },
            stimulus_width: { type: jspsych.ParameterType.INT, default: null },
            maintain_aspect_ratio: { type: jspsych.ParameterType.BOOL, default: true },
        },

        /**
         * Note:
         * This plugin assumes that all images in `images_pool` are preloaded using the jsPsychPreload plugin.
         * Without preloading, image decode may delay presentation timing, especially in fast RSVP streams.
         */

        /**
         * Indicate the data collected by this plugin.
         */
        data: {
            // bookkeeping
            block_num: { type: jspsych.ParameterType.INT },
            trial_num: { type: jspsych.ParameterType.INT },

            /**
             * Information about the presented image stream: the images consisting it, the length of the stream,
             * the time each image is presented (stim_ms) and the time between each image (isi_ms).
             */
            stream: { type: jspsych.ParameterType.STRING },
            stream_length: { type: jspsych.ParameterType.INT },
            stim_ms: { type: jspsych.ParameterType.INT },
            isi_ms: { type: jspsych.ParameterType.INT },

            /**
             * Whether one of the images in the stream failed to decode (affects timing).
             */
            img_decode_failed: { type: jspsych.ParameterType.BOOL },

            // Response Data
            /**
             * The time taken to encode the target image (in ms), until the subject indicated they are ready
             * to respond.
             */
            encoding_time: { type: jspsych.ParameterType.INT },

            /**
             * The target image presented to the subject, and its index in the stream.
             */
            target: { type: jspsych.ParameterType.STRING },
            target_index: { type: jspsych.ParameterType.INT },

            /**
             * Whether the subject responded during the stream.
             */
            responded: { type: jspsych.ParameterType.BOOL },

            /**
             * The index and name of the image the subject indicated they identified as the target
             */
            response_index: { type: jspsych.ParameterType.INT },
            response_image: { type: jspsych.ParameterType.STRING },

            /**
             * Whether the subject identified the target correctly.
             */
            correct: { type: jspsych.ParameterType.BOOL },
        }
    };

    class ImageStreamKeyboardResponsePlugin {
        constructor(jsPsych) { this.jsPsych = jsPsych; }
        static { this.info = info; }

        trial(display_element, trial) {
            // --- validate required params ---
            if (trial.stim_ms == null) {
                throw new Error('[image-stream-keyboard-response] Missing required parameter: stim_ms');
            }
            if (trial.isi_ms == null) {
                throw new Error('[image-stream-keyboard-response] Missing required parameter: isi_ms');
            }
            if (trial.stream_length == null) {
                throw new Error('[image-stream-keyboard-response] Missing required parameter: stream_length');
            }
            if (!Array.isArray(trial.images_pool) || (trial.images_pool.length === 0)) {
                throw new Error('[image-stream-keyboard-response] Missing required parameter: images_pool');
            }

            // book-keeping and trial parameters
            const block_num = (trial.block_num != null) ? trial.block_num : null;
            const trial_num = (trial.trial_num != null) ? trial.trial_num : null;
            const stim_ms = trial.stim_ms;
            const isi_ms = trial.isi_ms;
            const stream_len = trial.stream_length;
            const detect_key = trial.detect_key || ' ';
            let imgDecodeFailed = false;

            // choose trial's images & target
            const stream = this.jsPsych.randomization.sampleWithoutReplacement(trial.images_pool, stream_len);
            const targetIndex = Math.floor(Math.random() * stream.length);
            const target = stream[targetIndex];

            // ---------- Prepare context package ----------
            const ctxPkg = this._prepare_container(display_element, trial);

            // ---------- Phase A: target + encoding time ----------
            this._render_image_with_text(ctxPkg, target, trial, trial.target_text);
            let encListener = this.jsPsych.pluginAPI.getKeyboardResponse({
                callback_function: (infoK) => {
                    this.jsPsych.pluginAPI.cancelKeyboardResponse(encListener);
                    const encoding_time = infoK.rt; // ms since target shown
                    run_stream(encoding_time);
                },
                valid_responses: [detect_key], rt_method: 'performance', persist: false, allow_held_key: false
            });

            // ---------- Phase B: RSVP stream ----------
            const run_stream = (encoding_time) => {
                const drawImage = (src) => this._render_image_with_text(ctxPkg, src, trial);
                const hideImage = () => this._hide_image(ctxPkg);

                let timers = [];
                const setT = (fn, t) => {
                    const id = this.jsPsych.pluginAPI.setTimeout(fn, t);
                    timers.push(id);
                    return id;
                };

                let currentIndex = -1, responded = false, response_index = null, response_image = null;
                let streamListener = this.jsPsych.pluginAPI.getKeyboardResponse({
                    callback_function: (_responseInfo) => {
                        if (!responded && currentIndex >= 0) {
                            responded = true;
                            response_index = Math.max(0, currentIndex);
                            response_image = response_index >= 0 ? stream[response_index] : null;
                            finish();
                        }
                    },
                    valid_responses: [detect_key], rt_method: 'performance', persist: true, allow_held_key: false
                });

                const showNext = () => {
                    if (responded) { finish(); return; }
                    currentIndex += 1; if (currentIndex >= stream.length) { finish(); return; }
                    drawImage(stream[currentIndex]);
                    setT(() => { hideImage(); setT(showNext, isi_ms); }, stim_ms);
                };

                const finish = () => {
                    this.jsPsych.pluginAPI.cancelKeyboardResponse(streamListener);
                    this.jsPsych.pluginAPI.clearAllTimeouts();
                    const correct = (response_index === targetIndex);
                    const trial_data = {
                        block_num, trial_num, stim_ms, isi_ms, stream_length: stream_len,
                        encoding_time,
                        stream: JSON.stringify(stream), target, target_index: targetIndex,
                        responded, response_index, response_image, correct,
                        img_decode_failed: imgDecodeFailed || false
                    };
                    this.jsPsych.finishTrial(trial_data);
                };

                setT(showNext, 0); // align rt=0 with first frame
            };
        }

        // ---------- Rendering helpers ----------
        _prepare_container(display_element, trial) {
            while (display_element.firstChild) display_element.removeChild(display_element.firstChild);
            const wrap = document.createElement('div');     // create a wrapper div
            wrap.style.display = 'flex';
            wrap.style.flexDirection = 'column';
            wrap.style.alignItems = 'center';
            // create canvas or img element:
            let ctxPkg;
            const useCanvas = (trial.render_on_canvas !== false);   // default to canvas unless explicitly false
            if (useCanvas) {
                const canvas = document.createElement('canvas');
                canvas.id = 'jspsych-image-stream-canvas';
                canvas.style.margin = '0'; canvas.style.padding = '0';
                const ctx = canvas.getContext('2d');
                wrap.appendChild(canvas);
                ctxPkg = { mode: 'canvas', canvas, ctx };
            } else {
                const img = document.createElement('img');
                img.id = 'jspsych-image-stream-img';
                img.style.display = 'block'; img.style.margin = '0 auto'; img.style.visibility = 'hidden';
                wrap.appendChild(img);
                ctxPkg = { mode: 'img', img };
            }
            // create a text element below the canvas/image
            const textEl = document.createElement('div');
            textEl.id = 'jspsych-image-stream-image-text';
            textEl.style.marginTop = '8px';
            textEl.style.opacity = '0.85';
            wrap.appendChild(textEl);
            // return the ctxPkg
            display_element.appendChild(wrap);
            ctxPkg.textEl = textEl;
            return ctxPkg;
        }

        _render_image_with_text(ctxPkg, src, trial, textHTML) {
            if (ctxPkg.mode === 'canvas') {
                const img = new Image();
                img.onload = async () => {
                    if (img.decode) {
                        try {
                            await img.decode();
                        } catch (e) {
                            console.warn('[image-stream-keyboard-response] decode failed for', src, e);
                            imgDecodeFailed = true;
                        }
                    }
                    let width, height;
                    if (trial.stimulus_height !== null) {
                        height = trial.stimulus_height;
                        if (trial.stimulus_width == null && trial.maintain_aspect_ratio) {
                            width = img.naturalWidth * (trial.stimulus_height / img.naturalHeight);
                        }
                    } else { height = img.naturalHeight; }
                    if (trial.stimulus_width !== null) {
                        width = trial.stimulus_width;
                        if (trial.stimulus_height == null && trial.maintain_aspect_ratio) {
                            height = img.naturalHeight * (trial.stimulus_width / img.naturalWidth);
                        }
                    } else if (!(trial.stimulus_height !== null && trial.maintain_aspect_ratio)) {
                        width = img.naturalWidth;
                    }
                    ctxPkg.canvas.width = width; ctxPkg.canvas.height = height;
                    ctxPkg.ctx.clearRect(0, 0, width, height);
                    ctxPkg.ctx.drawImage(img, 0, 0, width, height);
                };
                img.src = src;
            } else {
                const imgEl = ctxPkg.img; imgEl.src = src;
                if (trial.stimulus_height !== null) imgEl.style.height = trial.stimulus_height + 'px';
                if (trial.stimulus_width !== null) imgEl.style.width = trial.stimulus_width + 'px';
                imgEl.style.visibility = 'visible';
            }
            if (ctxPkg.textEl) {    // append text
                ctxPkg.textEl.innerHTML = textHTML || '';
                ctxPkg.textEl.style.display = textHTML ? 'block' : 'none';
            }
        }

        _hide_image(ctxPkg) {
            if (ctxPkg.mode === 'canvas') {
                ctxPkg.ctx.clearRect(0, 0, ctxPkg.canvas.width || 1, ctxPkg.canvas.height || 1);
            } else {
                ctxPkg.img.style.visibility = 'hidden';
            }
        }

        // ---------- Simulation API ----------
        create_simulation_data(trial, simulation_options) {
            const default_data = {
                block_num: 1,
                trial_num: 1,
                stim_ms: trial.stim_ms ?? 100,
                isi_ms: trial.isi_ms ?? 0,
                stream_length: trial.stream_length ?? 10,
                encoding_time: 500,
                stream: JSON.stringify([]),
                target_index: 0,
                target: '',
                responded: true,
                response_index: Math.floor((trial.stream_length ?? 10) / 2),
                response_image: '',
                correct: Math.random() < 0.7,
                img_decode_failed: Math.random() < 0.05,
            };
            const data = this.jsPsych.pluginAPI.mergeSimulationData(default_data, simulation_options);
            this.jsPsych.pluginAPI.ensureSimulationDataConsistency(trial, data);
            return data;
        }

        simulate_data_only(trial, simulation_options) {
            const data = this.create_simulation_data(trial, simulation_options);
            this.jsPsych.finishTrial(data);
        }

        simulate_visual(trial, simulation_options, load_callback) {
            const data = this.create_simulation_data(trial, simulation_options);
            const imgTime = data.stim_ms + stim.isi_ms
            const display_element = this.jsPsych.getDisplayElement();
            this.trial(display_element, trial);
            load_callback();
            const detect = trial.detect_key || ' ';
            this.jsPsych.pluginAPI.pressKey(detect, 300);
            this.jsPsych.pluginAPI.pressKey(detect, Math.min(500, 2 * imgTime + 100));
        }
    }
    return ImageStreamKeyboardResponsePlugin;

})(jsPsychModule);
