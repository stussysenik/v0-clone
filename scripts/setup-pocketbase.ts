#!/usr/bin/env bun
// =============================================================================
// PocketBase Setup Script
// =============================================================================
// Creates collections programmatically via the Admin API
// Run: bun run scripts/setup-pocketbase.ts

import PocketBase from 'pocketbase'

const POCKETBASE_URL = process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090'

// Admin credentials - set via environment or prompt
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD

// =============================================================================
// Schema Definitions (matches schema.ts)
// =============================================================================

const COLLECTIONS = [
	{
		name: 'conversations',
		type: 'base',
		schema: [
			{
				name: 'title',
				type: 'text',
				required: true,
				options: { min: 1, max: 500 },
			},
			{
				name: 'status',
				type: 'select',
				required: true,
				options: { maxSelect: 1, values: ['active', 'archived'] },
			},
			{
				name: 'metadata',
				type: 'json',
				required: false,
				options: { maxSize: 2000000 },
			},
		],
		listRule: '',
		viewRule: '',
		createRule: '',
		updateRule: '',
		deleteRule: '',
	},
	{
		name: 'messages',
		type: 'base',
		schema: [
			{
				name: 'conversation',
				type: 'relation',
				required: true,
				options: {
					collectionId: '', // Will be filled after conversations created
					cascadeDelete: true,
					maxSelect: 1,
					displayFields: ['title'],
				},
			},
			{
				name: 'role',
				type: 'select',
				required: true,
				options: { maxSelect: 1, values: ['user', 'assistant', 'system'] },
			},
			{
				name: 'content',
				type: 'text',
				required: true,
				options: { min: 1, max: 100000 },
			},
			{
				name: 'metadata',
				type: 'json',
				required: false,
				options: { maxSize: 2000000 },
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
		name: 'generations',
		type: 'base',
		schema: [
			{
				name: 'conversation',
				type: 'relation',
				required: false,
				options: {
					collectionId: '', // Will be filled after conversations created
					cascadeDelete: false,
					maxSelect: 1,
					displayFields: ['title'],
				},
			},
			{
				name: 'prompt',
				type: 'text',
				required: true,
				options: { min: 1, max: 50000 },
			},
			{
				name: 'code',
				type: 'text',
				required: false,
				options: { min: 0, max: 500000 },
			},
			{
				name: 'html',
				type: 'text',
				required: false,
				options: { min: 0, max: 500000 },
			},
			{
				name: 'parent',
				type: 'relation',
				required: false,
				options: {
					collectionId: '', // Self-reference, filled after creation
					cascadeDelete: false,
					maxSelect: 1,
					displayFields: ['prompt'],
				},
			},
			{
				name: 'metadata',
				type: 'json',
				required: false,
				options: { maxSize: 2000000 },
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
		name: 'checkpoints',
		type: 'base',
		schema: [
			{
				name: 'generation',
				type: 'relation',
				required: true,
				options: {
					collectionId: '', // Will be filled after generations created
					cascadeDelete: true,
					maxSelect: 1,
					displayFields: ['prompt'],
				},
			},
			{
				name: 'code',
				type: 'text',
				required: true,
				options: { min: 0, max: 500000 },
			},
			{
				name: 'stage',
				type: 'text',
				required: true,
				options: { min: 1, max: 50 },
			},
			{
				name: 'data',
				type: 'json',
				required: false,
				options: { maxSize: 2000000 },
			},
		],
		indexes: ['CREATE INDEX idx_checkpoints_generation ON checkpoints (generation)'],
		listRule: '',
		viewRule: '',
		createRule: '',
		updateRule: '',
		deleteRule: '',
	},
]

// =============================================================================
// Helpers
// =============================================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
	const colors = {
		info: '\x1b[36m',
		success: '\x1b[32m',
		error: '\x1b[31m',
		warn: '\x1b[33m',
	}
	const icons = {
		info: 'ℹ',
		success: '✓',
		error: '✗',
		warn: '⚠',
	}
	console.log(`${colors[type]}${icons[type]}\x1b[0m ${message}`)
}

async function promptForCredentials(): Promise<{ email: string; password: string }> {
	// If env vars are set, use them
	if (ADMIN_EMAIL && ADMIN_PASSWORD) {
		return { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
	}

	// Otherwise prompt
	log('PocketBase admin credentials required', 'warn')
	log('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD env vars, or enter below:', 'info')

	const email = prompt('Admin email: ')
	const password = prompt('Admin password: ')

	if (!email || !password) {
		throw new Error('Admin credentials are required')
	}

	return { email, password }
}

// =============================================================================
// Main Setup
// =============================================================================

async function main() {
	console.log('\n')
	log('========================================', 'info')
	log('  PocketBase Setup for v0-clone', 'info')
	log('========================================', 'info')
	console.log()

	const pb = new PocketBase(POCKETBASE_URL)

	// Test connection
	log(`Connecting to ${POCKETBASE_URL}...`, 'info')
	try {
		await pb.health.check()
		log('PocketBase is running', 'success')
	} catch (err) {
		log(`Cannot connect to PocketBase at ${POCKETBASE_URL}`, 'error')
		log('Make sure PocketBase is running: pocketbase serve', 'warn')
		process.exit(1)
	}

	// Get admin credentials
	const { email, password } = await promptForCredentials()

	// Authenticate as admin
	log('Authenticating as admin...', 'info')
	try {
		await pb.admins.authWithPassword(email, password)
		log('Authenticated successfully', 'success')
	} catch (err) {
		log('Admin authentication failed', 'error')
		log('Make sure you have created an admin account in PocketBase', 'warn')
		process.exit(1)
	}

	// Track collection IDs for relations
	const collectionIds: Record<string, string> = {}

	// Check existing collections
	log('Checking existing collections...', 'info')
	const existingCollections = await pb.collections.getFullList()
	const existingNames = new Set(existingCollections.map((c) => c.name))

	for (const name of ['conversations', 'messages', 'generations', 'checkpoints']) {
		if (existingNames.has(name)) {
			const existing = existingCollections.find((c) => c.name === name)
			if (existing) {
				collectionIds[name] = existing.id
				log(`Collection "${name}" already exists (${existing.id})`, 'warn')
			}
		}
	}

	// Create collections in order
	console.log()
	log('Creating collections...', 'info')

	for (const collectionDef of COLLECTIONS) {
		const { name, schema, ...rest } = collectionDef

		// Skip if already exists
		if (collectionIds[name]) {
			continue
		}

		// Update relation collectionIds
		const updatedSchema = schema.map((field) => {
			if (field.type === 'relation' && field.options) {
				const opts = field.options as { collectionId: string }
				if (field.name === 'conversation' && collectionIds.conversations) {
					opts.collectionId = collectionIds.conversations
				} else if (field.name === 'parent' && collectionIds.generations) {
					opts.collectionId = collectionIds.generations
				} else if (field.name === 'generation' && collectionIds.generations) {
					opts.collectionId = collectionIds.generations
				}
			}
			return field
		})

		try {
			const created = await pb.collections.create({
				name,
				schema: updatedSchema,
				...rest,
			})
			collectionIds[name] = created.id
			log(`Created collection "${name}" (${created.id})`, 'success')
		} catch (err) {
			const error = err as Error
			log(`Failed to create "${name}": ${error.message}`, 'error')
		}
	}

	// Update relations that reference other collections
	console.log()
	log('Updating collection relations...', 'info')

	// Update messages.conversation relation
	if (collectionIds.messages && collectionIds.conversations) {
		try {
			const messagesCollection = await pb.collections.getOne(collectionIds.messages)
			const updatedSchema = messagesCollection.schema.map((field: { name: string; options?: { collectionId: string } }) => {
				if (field.name === 'conversation' && field.options) {
					field.options.collectionId = collectionIds.conversations
				}
				return field
			})
			await pb.collections.update(collectionIds.messages, { schema: updatedSchema })
			log('Updated messages.conversation relation', 'success')
		} catch (err) {
			log('Failed to update messages relation (may already be correct)', 'warn')
		}
	}

	// Update generations.conversation and generations.parent relations
	if (collectionIds.generations && collectionIds.conversations) {
		try {
			const genCollection = await pb.collections.getOne(collectionIds.generations)
			const updatedSchema = genCollection.schema.map((field: { name: string; options?: { collectionId: string } }) => {
				if (field.name === 'conversation' && field.options) {
					field.options.collectionId = collectionIds.conversations
				} else if (field.name === 'parent' && field.options) {
					field.options.collectionId = collectionIds.generations
				}
				return field
			})
			await pb.collections.update(collectionIds.generations, { schema: updatedSchema })
			log('Updated generations relations', 'success')
		} catch (err) {
			log('Failed to update generations relations (may already be correct)', 'warn')
		}
	}

	// Update checkpoints.generation relation
	if (collectionIds.checkpoints && collectionIds.generations) {
		try {
			const checkpointsCollection = await pb.collections.getOne(collectionIds.checkpoints)
			const updatedSchema = checkpointsCollection.schema.map((field: { name: string; options?: { collectionId: string } }) => {
				if (field.name === 'generation' && field.options) {
					field.options.collectionId = collectionIds.generations
				}
				return field
			})
			await pb.collections.update(collectionIds.checkpoints, { schema: updatedSchema })
			log('Updated checkpoints.generation relation', 'success')
		} catch (err) {
			log('Failed to update checkpoints relation (may already be correct)', 'warn')
		}
	}

	// Summary
	console.log()
	log('========================================', 'info')
	log('  Setup Complete!', 'success')
	log('========================================', 'info')
	console.log()
	log('Collection IDs:', 'info')
	for (const [name, id] of Object.entries(collectionIds)) {
		console.log(`  ${name}: ${id}`)
	}
	console.log()
	log('You can now run the studio: bun run dev:studio', 'info')
	console.log()
}

main().catch((err) => {
	log(`Setup failed: ${err.message}`, 'error')
	process.exit(1)
})
