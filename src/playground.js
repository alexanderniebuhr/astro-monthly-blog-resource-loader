const a = await fetch("https://raw.githubusercontent.com/withastro/astro.build/c24893d9ded5952a910f60632305226c1f3e667c/src/content/blog/whats-new-august-2024.mdx")

const doc = await a.text()

import { fromMarkdown } from 'mdast-util-from-markdown'
import { mdxFromMarkdown } from 'mdast-util-mdx'
import { mdxjs } from 'micromark-extension-mdxjs'

const tree = fromMarkdown(doc, {
  extensions: [mdxjs({})],
  mdastExtensions: [mdxFromMarkdown()]
})
import { headingRange } from 'mdast-util-heading-range'

let sections
headingRange(tree, "Content", (start, nodes) => {
  sections = nodes
})


import { u } from 'unist-builder'
const newTree = u('root', [
  ...sections
])

import { inspect } from 'unist-util-inspect'
// console.log(inspect(tree))
// console.log(tree)

import { matches, select, selectAll } from 'unist-util-select'
const b = selectAll('link', newTree)
console.log(b[0])
// console.log(inspect(b))

const c = selectAll('[name=YouTubeGrid]', tree)
// console.log(c)
console.log(c[0].attributes[0].value.data.estree.body[0].expression.elements[0].properties[0].key.name)
console.log(c[0].attributes[0].value.data.estree.body[0].expression.elements[0].properties[0].value.raw)
console.log(c[0].attributes[0].value.data.estree.body[0].expression.elements[0].properties[1].key.name)
console.log(c[0].attributes[0].value.data.estree.body[0].expression.elements[0].properties[1].value.raw)