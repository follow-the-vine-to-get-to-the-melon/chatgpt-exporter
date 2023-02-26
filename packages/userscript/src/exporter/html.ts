import { ChatGPTAvatar } from '../icons'
import { getConversation } from '../parser'
import { downloadFile, getFileNameWithFormat } from '../utils/download'

import templateHtml from '../template.html?raw'
import type { ConversationLine } from '../type'
import { getColorScheme } from '../utils/utils'
import { standardizeLineBreaks } from '../utils/text'

const skipWrap = [
    'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote',
    'ul', 'ol',
    'pre',
    'table',
]

export function exportToHtml(fileNameFormat: string) {
    const conversations = getConversation()
    if (conversations.length === 0) return alert('No conversation found. Please send a message first.')

    const lang = document.documentElement.lang ?? 'en'
    const conversationHtml = conversations.map((item) => {
        const { author: { name, avatar }, lines } = item

        const avatarEl = name === 'ChatGPT'
            ? `${ChatGPTAvatar}`
            : `<img src="${avatar}" alt="${name}" />`

        const linesHtml = lines.map((line) => {
            const lineHtml = lineToHtml(line)

            if (skipWrap.some(tag => lineHtml.startsWith(`<${tag}`))) return lineHtml
            return `<p>${lineHtml}</p>`
        }).join('')

        return `
<div class="conversation-item">
    <div class="author">
        ${avatarEl}
    </div>
    <div class="conversation-content-wrapper">
        <div class="conversation-content">
            ${linesHtml}
        </div>
    </div>
</div>`
    }).join('')

    const title = document.title === 'New chat' ? 'ChatGPT Conversation' : document.title

    const html = templateHtml
        .replaceAll('{{title}}', title)
        .replaceAll('{{time}}', new Date().toISOString())
        .replaceAll('{{lang}}', lang)
        .replaceAll('{{theme}}', getColorScheme())
        .replaceAll('{{content}}', conversationHtml)

    const fileName = getFileNameWithFormat(fileNameFormat, 'html')
    downloadFile(fileName, 'text/html', standardizeLineBreaks(html))
}

function lineToHtml(line: ConversationLine): string {
    // eslint-disable-next-line array-callback-return
    return line.map((node) => {
        const nodeType = node.type
        switch (nodeType) {
            case 'hr': return '<hr>'
            case 'text':
                return escapeHtml(node.text)
            case 'bold':
                return `<strong>${escapeHtml(node.text)}</strong>`
            case 'italic':
                return `<em>${escapeHtml(node.text)}</em>`
            case 'heading':
                return `<h${node.level}>${escapeHtml(node.text)}</h${node.level}>`
            case 'quote':
                return `<blockquote><p>${escapeHtml(node.text)}</p></blockquote>`
            case 'image':
                return `<img src="${node.src}" referrerpolicy="no-referrer" />`
            case 'link':
                return `<a href="${node.href}" target="_blank" rel="noopener noreferrer">${escapeHtml(node.text)}</a>`
            case 'ordered-list-item': {
                const start = node.start ? ` start=${node.start}` : ''
                const content = node.items.map(item => `<li>${item.map(line => lineToHtml(line)).join('\n')}</li>`).join('')
                return `<ol${start}>${content}</ol>`
            }
            case 'unordered-list-item':{
                const content = node.items.map(item => `<li>${item.map(line => lineToHtml(line)).join('\n')}</li>`).join('')
                return `<ul>${content}</ul>`
            }
            case 'code':
                return `<code>${escapeHtml(node.code)}</code>`
            case 'code-block':
                return `<pre><code class="language-${node.lang}">${escapeHtml(node.code)}</code></pre>`
            case 'table': {
                const header = node.headers.map(item => `<th>${escapeHtml(item)}</th>`).join('')
                const body = node.rows.map(row => `<tr>${row.map(item => `<td>${escapeHtml(item)}</td>`).join('')}</tr>`).join('')
                return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`
            }
        }
    }).join('')
}

function escapeHtml(html: string) {
    return html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}
