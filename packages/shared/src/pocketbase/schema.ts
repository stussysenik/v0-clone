// =============================================================================
// PocketBase Schema Definition
// =============================================================================
// Use this to create the collections in PocketBase Admin UI
// or programmatically via the Admin API

/**
 * Schema definitions for PocketBase collections
 * These can be imported into PocketBase using the Admin UI:
 * Settings > Import collections
 */
// Collection IDs - used for relations
export const COLLECTION_IDS = {
	conversations: 'conversations0001',
	messages: 'messages00001',
	generations: 'generations001',
	checkpoints: 'checkpoints001',
} as const

export const pbSchema = [
	{
		id: COLLECTION_IDS.conversations,
		name: 'conversations',
		type: 'base',
		system: false,
		schema: [
			{
				id: 'conv_title0001',
				name: 'title',
				type: 'text',
				system: false,
				required: true,
				options: {
					min: 1,
					max: 500,
					pattern: '',
				},
			},
			{
				id: 'conv_status001',
				name: 'status',
				type: 'select',
				system: false,
				required: true,
				options: {
					maxSelect: 1,
					values: ['active', 'archived'],
				},
			},
			{
				id: 'conv_meta0001',
				name: 'metadata',
				type: 'json',
				system: false,
				required: false,
				options: {
					maxSize: 2000000,
				},
			},
		],
		indexes: [],
		listRule: '',
		viewRule: '',
		createRule: '',
		updateRule: '',
		deleteRule: '',
	},
	{
		id: COLLECTION_IDS.messages,
		name: 'messages',
		type: 'base',
		system: false,
		schema: [
			{
				id: 'msg_conv00001',
				name: 'conversation',
				type: 'relation',
				system: false,
				required: true,
				options: {
					collectionId: COLLECTION_IDS.conversations,
					cascadeDelete: true,
					minSelect: null,
					maxSelect: 1,
					displayFields: ['title'],
				},
			},
			{
				id: 'msg_role00001',
				name: 'role',
				type: 'select',
				system: false,
				required: true,
				options: {
					maxSelect: 1,
					values: ['user', 'assistant', 'system'],
				},
			},
			{
				id: 'msg_content01',
				name: 'content',
				type: 'text',
				system: false,
				required: true,
				options: {
					min: 1,
					max: 100000,
					pattern: '',
				},
			},
			{
				id: 'msg_meta00001',
				name: 'metadata',
				type: 'json',
				system: false,
				required: false,
				options: {
					maxSize: 2000000,
				},
			},
		],
		indexes: [
			'CREATE INDEX idx_messages_conversation ON messages (conversation)',
			'CREATE INDEX idx_messages_created ON messages (created)',
		],
		listRule: '',
		viewRule: '',
		createRule: '',
		updateRule: '',
		deleteRule: '',
	},
	{
		id: COLLECTION_IDS.generations,
		name: 'generations',
		type: 'base',
		system: false,
		schema: [
			{
				id: 'gen_conv00001',
				name: 'conversation',
				type: 'relation',
				system: false,
				required: false,
				options: {
					collectionId: COLLECTION_IDS.conversations,
					cascadeDelete: false,
					minSelect: null,
					maxSelect: 1,
					displayFields: ['title'],
				},
			},
			{
				id: 'gen_prompt001',
				name: 'prompt',
				type: 'text',
				system: false,
				required: true,
				options: {
					min: 1,
					max: 50000,
					pattern: '',
				},
			},
			{
				id: 'gen_code00001',
				name: 'code',
				type: 'text',
				system: false,
				required: true,
				options: {
					min: 0,
					max: 500000,
					pattern: '',
				},
			},
			{
				id: 'gen_html00001',
				name: 'html',
				type: 'text',
				system: false,
				required: true,
				options: {
					min: 0,
					max: 500000,
					pattern: '',
				},
			},
			{
				id: 'gen_parent001',
				name: 'parent',
				type: 'relation',
				system: false,
				required: false,
				options: {
					collectionId: COLLECTION_IDS.generations,
					cascadeDelete: false,
					minSelect: null,
					maxSelect: 1,
					displayFields: ['prompt'],
				},
			},
			{
				id: 'gen_meta00001',
				name: 'metadata',
				type: 'json',
				system: false,
				required: false,
				options: {
					maxSize: 2000000,
				},
			},
		],
		indexes: [
			'CREATE INDEX idx_generations_conversation ON generations (conversation)',
			'CREATE INDEX idx_generations_parent ON generations (parent)',
			'CREATE INDEX idx_generations_created ON generations (created)',
		],
		listRule: '',
		viewRule: '',
		createRule: '',
		updateRule: '',
		deleteRule: '',
	},
	{
		id: COLLECTION_IDS.checkpoints,
		name: 'checkpoints',
		type: 'base',
		system: false,
		schema: [
			{
				id: 'chk_gen000001',
				name: 'generation',
				type: 'relation',
				system: false,
				required: true,
				options: {
					collectionId: COLLECTION_IDS.generations,
					cascadeDelete: true,
					minSelect: null,
					maxSelect: 1,
					displayFields: ['prompt'],
				},
			},
			{
				id: 'chk_code00001',
				name: 'code',
				type: 'text',
				system: false,
				required: true,
				options: {
					min: 0,
					max: 500000,
					pattern: '',
				},
			},
			{
				id: 'chk_stage0001',
				name: 'stage',
				type: 'text',
				system: false,
				required: true,
				options: {
					min: 1,
					max: 50,
					pattern: '',
				},
			},
			{
				id: 'chk_data00001',
				name: 'data',
				type: 'json',
				system: false,
				required: false,
				options: {
					maxSize: 2000000,
				},
			},
		],
		indexes: [
			'CREATE INDEX idx_checkpoints_generation ON checkpoints (generation)',
		],
		listRule: '',
		viewRule: '',
		createRule: '',
		updateRule: '',
		deleteRule: '',
	},
]

/**
 * Export schema as JSON string for importing into PocketBase
 */
export function exportSchemaJSON(): string {
	return JSON.stringify(pbSchema, null, 2)
}

/**
 * Instructions for setting up PocketBase
 */
export const setupInstructions = `
# PocketBase Setup for v0-clone

## Option 1: Local Development

1. Download PocketBase from https://pocketbase.io/docs/
2. Run: ./pocketbase serve
3. Open Admin UI at http://127.0.0.1:8090/_/
4. Create an admin account
5. Go to Settings > Import collections
6. Paste the schema JSON from this file

## Option 2: PocketHost.io (Free Hosting)

1. Go to https://pockethost.io
2. Create a free account
3. Create a new instance
4. Import the schema in Admin UI
5. Update POCKETBASE_URL in your .env

## Option 3: Self-hosted

1. Deploy PocketBase to a VPS (Hetzner, DigitalOcean, Railway)
2. Use Docker or run the binary directly
3. Set up SSL with reverse proxy (nginx/caddy)
4. Update POCKETBASE_URL in your .env

## Environment Variables

Add to your .env file:
POCKETBASE_URL=http://127.0.0.1:8090

Or for SvelteKit:
PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
`

export default pbSchema
