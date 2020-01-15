const axios = require('axios')
const path = require('path')
const fs = require('fs')
const fsExtra = require('fs-extra')
const ffmpeg = require('fluent-ffmpeg')
const _ = require('lodash')
const { Scene } = require('spritejs')
const { uuid } = require('./utils')
const Animate = require('./animate')
const { MAX_FRAMES_PER_VIDEO } = require('../constants')

const resolvePath = file => path.resolve(__dirname, file)

class Convert {
  constructor({ wordList, audioUrl }) {
    this.wordList = wordList
    this.audioUrl = audioUrl

    this.uuid = uuid()

    this._initOutputPath(this.uuid)
    this._initFrameInfo()
    this._initLayer()
  }

  // 初始化临时文件路径
  _initOutputPath(uuid) {
    // 临时文件路径
    this.tempFolder = resolvePath(`../tmp/${uuid}`)
    this.framesTempFolder = resolvePath(`../tmp/${uuid}/frames`)
    this.videosTempFolder = resolvePath(`../tmp/${uuid}/videos`)
    this.audioTempFile = resolvePath(`../tmp/${uuid}/audio.mp3`)
    // 最终视频路径
    this.videoOutput = resolvePath(`../tmp/video-${uuid}.mp4`)
    // 生成临时文件夹
    fsExtra.mkdirpSync(this.framesTempFolder)
    fsExtra.mkdirpSync(this.videosTempFolder)
  }

  // 初始化帧信息
  _initFrameInfo() {
    this.frameInfos = []
    this.frameIndex = 0
  }

  // 初始化画布相关
  _initLayer() {
    // 创建场景
    this.scene = new Scene('#container', { 
      resolution: [540, 960],
      viewport: [540, 960],
    })
    // 创建画布
    this.layer = this.scene.layer('fglayer', {
      pos: [0, 0],
      size: [540, 960],
      bgcolor: '#181818',
    })
  }

  // 下载音频文件
  async _downloadAudio() {
    if (!this.audioUrl) return false
    try {
      if (new RegExp(/(http|https):\/\/([\w.]+\/?)\S*/).test(this.audioUrl)) {
        const res = await axios.get(this.audioUrl, { responseType:'stream' })
        res.data.pipe(fs.createWriteStream(this.audioTempFile))
      } else {
        fs.createReadStream(this.audioUrl).pipe(fs.createWriteStream(this.audioTempFile))
      }
      return true
    } catch (err) {
      return false
    }
  }

  // 生成视频
  async _saveToVideo() {
    // 帧过多 则拆分成若干组 分别生成视频 最后合并视频
    const frameChunks = _.chunk(this.frameInfos, MAX_FRAMES_PER_VIDEO)
    
    try {
      let videoOutput
      if (frameChunks.length === 1) {
        videoOutput = await this._mergeFrames(this.frameInfos)
      } else if (frameChunks.length > 1) {
        let i = 0, parts = []
        while(frameChunks[i]) {
          const video = await this._mergeFrames(frameChunks[i], i)
          parts.push(video)
          i++
        }
        videoOutput = await this._mergeVideos(parts)
      }
      console.log(`'${videoOutput}' saved`)
    } catch (err) {
      console.log(err)
    }
    this._removeTempFile()
  }

  // 将帧合并成视频
  _mergeFrames(inputs, index) {
    const f = new ffmpeg()
    let videoOutput

    if (index === undefined && this.hasAudio) {
      f.input(this.audioTempFile)
      videoOutput = this.videoOutput
    } else {
      videoOutput = path.join(this.videosTempFolder, `video-${index}.mp4`)
    }

    inputs.forEach(input => {
      f.input(`${this.framesTempFolder}/frame-${input.index}.png`);
      if (input.duration > 0) f.inputOptions(['-loop 1' , `-t ${input.duration / 1000}`]);
    });

    return new Promise((resolve, reject) => {
      f.outputOptions(['-c:v libx264', '-r 30', '-s 540x960', '-pix_fmt yuv420p', '-threads 1'])
        .complexFilter([{
          filter: 'concat',
          options: {
            n: inputs.length,
          },
        }])
        .save(videoOutput)
        .on('end', (res) => {
          resolve(videoOutput)
          console.log('=>', videoOutput)
        })
        .on('error', (err) => {
          reject(err.message)
          console.log('=> merge frames error')
        })
    })
  }

  // 将视频片段合并成视频
  _mergeVideos(videos) {
    const f = new ffmpeg()

    if (this.hasAudio) f.input(this.audioTempFile)

    videos.forEach((video) => {
      f.input(video);
    })

    return new Promise((resolve, reject) => {
      f.complexFilter([{
          filter: 'concat',
          options: {
            n: videos.length,
          },
        }])
        .save(this.videoOutput)
        .on('end', async(res) => {
          resolve(this.videoOutput)
          console.log('=>', this.videoOutput)
        })
        .on('error', (err) => {
          reject(err.message)
          console.log('=> merge videos error')
        });
    })
  }

  // 删除临时文件
  _removeTempFile() {
    fsExtra.removeSync(this.tempFolder)
    console.log(`temporary folder '${this.tempFolder}' removed`)
  }

  async render() {
    // 生成关键帧图片
    const _frameShot = async(duration) => {
      duration = typeof duration === 'number' ? Math.max(duration, 0) : 0
      const canvas = await this.scene.snapshot()
      this.frameInfos.push({
        index: this.frameIndex,
        duration,
      })
      fs.writeFileSync(`${this.framesTempFolder}/frame-${this.frameIndex}.png`, canvas.toBuffer())
      this.frameIndex++
    }

    const animate = new Animate({
      layer: this.layer,
      words: this.wordList,
      windowH: 960,
      windowW: 540,
      onUpdate: _frameShot,
    });

    let index = 0;
    while(this.wordList[index]) {
      index = await animate.run();
    }

    await _frameShot(animate.keyframeEnd - animate.keyframeBegin)
    this.hasAudio = await this._downloadAudio()
    await this._saveToVideo()
  }
}

module.exports = Convert;