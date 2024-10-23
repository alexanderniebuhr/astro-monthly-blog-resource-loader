import type { Loader } from "astro/loaders";

import { AstroError } from "astro/errors";
import { z } from "astro/zod";
import { fromMarkdown } from "mdast-util-from-markdown";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { mdxjs } from "micromark-extension-mdxjs";
// import { inspect } from "unist-util-inspect";
import { selectAll } from "unist-util-select";
import pkg from "../package.json";

const USER_CONFIG_SCHEMA = z.object({
	urls: z
		.string()
		.url()
		.transform((url) => new URL(url))
		.array(),
	exclude: z.instanceof(RegExp).array(),
});

type USER_CONFIG_TYPE = z.input<typeof USER_CONFIG_SCHEMA>;
// export type NpmPackagesLoaderConfig = z.output<typeof NpmPackagesLoaderConfigSchema>

const SCHEMA = z.object({
	title: z.string(),
	url: z.string().url(),
	source_url: z.string().url().optional(),
});

async function fetchResources(params: { url: URL }) {
	const path_segment = params.url.pathname.split("/").slice(-1)[0].replace('.mdx', '');
	const source_url = `https://astro.build/blog/${path_segment}/`;
	const res = await fetch(params.url);
	if (!res.ok || !res.body) {
		throw new AstroError(
			`Failed to fetch the blog post from ${params.url.toString()}`,
			`\n\nIf you believe this is a bug, please file an issue at ${pkg.bugs}/new/choose`,
		);
	}
	const parsedRes = await res.text();

	const tree = fromMarkdown(parsedRes, {
		extensions: [mdxjs({})],
		mdastExtensions: [mdxFromMarkdown()],
	});

	const treeLinks = selectAll("link", tree) as unknown[] as {
		url: string;
		children: { value: string }[];
		source_url: string;
	}[];

	const extractedLinks = new Array<{
		url: string;
		title: string;
		source_url: string;
	}>();

	for (const link of treeLinks) {
		extractedLinks.push({
			url: link.url,
			title: link.children[0].value,
			source_url: source_url,
		});
	}

	const videoGrid = selectAll("[name=YouTubeGrid]", tree);
	if (videoGrid[0]) {
		// @ts-expect-error
		for (const videoLink of videoGrid[0].attributes[0].value.data.estree.body[0]
			.expression.elements) {
			extractedLinks.push({
				url: videoLink.properties[0].value.value,
				title: videoLink.properties[1].value.value,
				source_url: source_url,
			});
		}
	}

	return extractedLinks;
}

export function astroMonthlyBlogResourceLoader(
	config: USER_CONFIG_TYPE,
): Loader {
	const PARSED_CONFIG = USER_CONFIG_SCHEMA.safeParse(config);

	if (!PARSED_CONFIG.success) {
		throw new AstroError(
			`The provided loader configuration is invalid.\n${PARSED_CONFIG.error.issues.map((issue) => issue.message).join("\n")}`,
			`See the error report above for more informations.\n\nIf you believe this is a bug, please file an issue at ${pkg.bugs}/new/choose`,
		);
	}

	return {
		name: "astro-monthly-blog-resource-loader",
		schema: SCHEMA,
		async load({ store, logger, parseData, generateDigest }) {
			store.clear();
			for (const url of PARSED_CONFIG.data.urls) {
				logger.info(`Loading resources for ${url.toString()}`);
				const resources = await fetchResources({ url });

				for (const extractedLink of resources) {
					if (
						PARSED_CONFIG.data.exclude.some((exclude) =>
							exclude.test(extractedLink.url),
						)
					)
						continue;

					const data = await parseData({
						id: extractedLink.url,
						data: {
							title: extractedLink.title,
							url: extractedLink.url,
							source_url: extractedLink.source_url,
						},
					});

					const digest = generateDigest(data);

					store.set({
						id: extractedLink.url,
						data,
						digest,
					});
				}
			}
		},
	};
}
