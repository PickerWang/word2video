const {Label, Group, Sprite} = require('spritejs');

class Animate {
  constructor({
    layer,
    words,
    width,
    height,
    padding,
    color,
    hlColor,
    onUpdate,
  }) {
    this.layer = layer; // 画布实例
    this.words = words; // 文字信息
    this.width = width || 540; // 画布宽度
    this.height = height || 960; // 画布高度
    this.padding = padding || 70; // 画布内间距
    this.color = color || '#FFFFFF'; // 文字颜色
    this.hlColor = hlColor || '#FF0000'; // 重点文字颜色
    this.onUpdate = onUpdate || function(){}; // 动画更新回调

    this.keyframeBegin = 0; // 帧开始时间
    this.keyframeEnd = 0; // 帧结束时间
    this.lineWidth = this.width - this.padding * 2; // 文字行宽
    this.index = 0; // 文字行序号
    this.animationGroups = []; // 动画分组
  }

  async run() {
    const sentence = this.words[this.index];

    this.keyframeEnd = sentence.start;
    await this.onUpdate(this.keyframeEnd - this.keyframeBegin);
    this.keyframeBegin = sentence.start;
    this.keyframeEnd = sentence.end; // 仅最后一次动画后会用到
    this.layer.on('update', this.onUpdate);

    const text = new Label(sentence.text);
    const wordWidth = parseInt(this.lineWidth / sentence.text.length);
    const fontSize = parseInt(wordWidth / 1.5);
    const posY = this.width / 2;
    const padding = 15;
    const scale = (this.index % 2) ? 0.7 : 1.2;
    const lineWidth = wordWidth * sentence.text.length;

    text.attr({
      pos: [this.padding, posY],
      fillColor: sentence.is_hl ? this.hlColor : this.color,
      font: `${fontSize}px "WenQuanYi Micro Hei", Arial, sans-serif`,
      anchor: [0, 1],
      lineBreak: 'normal',
      textAlign: 'left',
      width: this.lineWidth,
      lineHeight: fontSize,
    });

    this.layer.append(text);

    const animation = text.animate([
      { scale: 0.7, opacity: 0 },
      { scale: 1.5, opacity: 1 },
    ], {
      duration: 300,
      iterations: 1,
      easing: 'ease-out',
      fill: 'forwards',
    });

    const group = this.animationGroups[this.animationGroups.length - 1];
    const newGroup = new Group();
    this.layer.append(newGroup);

    if (group) {
      if (this.index % 5 === 0) {
        group.attr({
          transformOrigin: this.index % 2 ? [this.padding, posY] : [this.padding + lineWidth, posY],
        });
        group.transition(0.3).attr({
          y: y => y,
          x: x => {
            if(this.index % 2) {
              return x - this.padding / 2
            } else {
              return x + this.padding / 2
            }
          },
          rotate: this.index % 2 ? -90 : 90,
        });
      } else {
        group.attr({
          transformOrigin: [this.padding, posY]
        });
        group.transition(0.3).attr({
          scale: [scale, scale],
          y: y => {
            return y - wordWidth - padding
          },
        });
      }
      if (this.index > 10) { // 分组层数过多回影响性能
        try {
          group
            .children[0].children[0].children[0]
            .children[0].children[0].children[0]
            .children[0].children[0].children[0]
            .clear();
        } catch(e) {}
      }
      newGroup.append(group);
    }
    newGroup.append(text);
    this.animationGroups.push(newGroup);

    await animation.finished;
    this.layer.off('update');
    this.index++;
    return this.index;
  }
}

module.exports = Animate;