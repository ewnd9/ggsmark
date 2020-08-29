import { HtmlRenderer, Parser, Node } from 'commonmark'
import DOMPurify from 'dompurify'
import axios from 'axios'

const getSoundCloud = async (url) => {
  try {
    const resp = await axios.get(
      `https://soundcloud.com/oembed?&format=json&url=${url}&maxheight=166`
    )
    console.log(resp.data)
  } catch (err) {
    // Handle Error Here
    console.error(err)
  }
}

export default function (text) {
  let reader = new Parser()
  let writer = new HtmlRenderer()
  let parsed = reader.parse(text)
  var walker = parsed.walker()
  let event, node

  while ((event = walker.next())) {
    node = event.node

    if (
      node.type === 'text' &&
      !!node.parent &&
      node.parent.type === 'paragraph' &&
      node.literal.match(/\:youtube/)
    ) {
      let nestedEvent = walker.next()
      let nestedNode = nestedEvent.node

      // Make sure text nodes are not fragmented
      while (!!nestedNode.prev && nestedNode.type === 'text') {
        nestedNode.prev.literal = nestedNode.prev.literal + nestedNode.literal
        nestedNode.unlink()
        nestedEvent = walker.next()
        nestedNode = nestedEvent.node
      }

      let matchYoutubeExp = /\:(?:youtube)\s(?:https?\:\/\/)?(?:www\.)?(?:youtube\.com\/watch|youtu\.be\/)(?:\?v\=)?([^\s]+)/
      let splitText = node.literal.split(matchYoutubeExp)

      for (let index in splitText) {
        if (index % 2 == 0) {
          let text = new Node('text')
          text.literal = splitText[index]
          node.insertBefore(text)
        } else {
          let div = new Node('custom_block')
          div.onEnter = '<div class="youtube-video">'
          div.onExit = '</div>'
          let iframe = new Node('custom_inline')
          iframe.onEnter = `<iframe src="https://www.youtube.com/embed/${splitText[index]}" type="text/html" frameborder="0">`
          iframe.onExit = '</iframe>'
          div.appendChild(iframe)
          node.insertBefore(div)
        }
      }

      node.unlink()
    } else if (
      node.type === 'text' &&
      !!node.parent &&
      node.parent.type === 'paragraph' &&
      node.literal.match(/\:soundcloud/)
    ) {
      let nestedEvent = walker.next()
      let nestedNode = nestedEvent.node

      // Make sure text nodes are not fragmented
      while (!!nestedNode.prev && nestedNode.type === 'text') {
        nestedNode.prev.literal = nestedNode.prev.literal + nestedNode.literal
        nestedNode.unlink()
        nestedEvent = walker.next()
        nestedNode = nestedEvent.node
      }

      let matchSoundCloudExp = /(?:soundcloud|sc)\s((?:https?\:\/\/)?(?:www\.)?(?:soundcloud\.com\/)[^&#\s\?]+\/[^&#\s\?]+)/
      let soundCloudMatch = node.literal.match(matchSoundCloudExp)

      if (soundCloudMatch !== undefined) {
        let soundCloudUrl = soundCloudMatch[1]
        let soundCloudData = axios
          .get(
            `https://soundcloud.com/oembed?&format=json&url=${soundCloudUrl}&maxheight=166`
          )
          .then((response) => {
            console.log(response)
            let div = new Node('custom_block')
            div.onEnter = '<div class="soundcloud">'
            div.onExit = '</div>'
            let iframe = new Node('custom_inline')
            div.appendChild(iframe)
            node.insertBefore(div)
            debugger
          })
        // let soundCloudData = getSoundCloud(soundCloudUrl)
        debugger
      }

      node.unlink()
    }
  }

  return DOMPurify.sanitize(writer.render(parsed), { ADD_TAGS: ['iframe'] })
}
