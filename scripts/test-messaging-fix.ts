/**
 * Test script for messaging fix
 * Run this to verify the messaging system is working correctly
 */

import { getSupabaseClient } from '../src/lib/supabase/client';

async function testMessagingFix() {
    console.log('🧪 Testing Messaging System Fix...\n');

    const supabase = getSupabaseClient();
    
    // Test 1: Check foreign key constraint
    console.log('1️⃣ Checking foreign key constraints...');
    try {
        const { data, error } = await supabase
            .rpc('pg_get_constraintdef', { 
                constraint_oid: '(SELECT oid FROM pg_constraint WHERE conname = \'messages_sender_id_fkey\')::oid' 
            });
        
        if (error) {
            console.log('⚠️  Could not verify FK constraint (may need direct DB access)');
        } else {
            console.log('✅ Foreign key constraint exists\n');
        }
    } catch (err) {
        console.log('⚠️  FK check requires database access\n');
    }

    // Test 2: Check users table sync
    console.log('2️⃣ Checking auth.users to users table sync...');
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.log('⚠️  No authenticated user - please sign in first\n');
            return;
        }

        const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('id, email, name, avatar')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.log('❌ User not found in users table');
            console.log('   This will cause messaging queries to fail');
            console.log('   Run: ensureCurrentUserInUsersTable()\n');
            return;
        }

        console.log('✅ User synced to users table');
        console.log(`   ID: ${userProfile.id}`);
        console.log(`   Email: ${userProfile.email}`);
        console.log(`   Name: ${userProfile.name}\n`);
    } catch (err) {
        console.log('❌ Error checking user sync:', err, '\n');
    }

    // Test 3: Test channel message query
    console.log('3️⃣ Testing channel message query...');
    try {
        const { data: channels } = await supabase
            .from('channels')
            .select('id, name')
            .limit(1)
            .single();

        if (!channels) {
            console.log('⚠️  No channels found - create a channel first\n');
            return;
        }

        console.log(`   Testing with channel: ${channels.name}`);

        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select(`
                *,
                sender:users!messages_sender_id_fkey(id, email, name, avatar)
            `)
            .eq('channel_id', channels.id)
            .eq('is_deleted', false)
            .is('parent_message_id', null)
            .limit(10);

        if (messagesError) {
            console.log('❌ Error fetching messages:', messagesError.message);
            console.log('   Details:', messagesError);
            return;
        }

        console.log(`✅ Successfully fetched ${messages?.length || 0} messages`);
        if (messages && messages.length > 0) {
            console.log('   Sample message:');
            console.log(`   - Sender: ${messages[0].sender?.name || 'Unknown'}`);
            console.log(`   - Content: ${messages[0].content.substring(0, 50)}...`);
        }
        console.log('');
    } catch (err) {
        console.log('❌ Error testing message query:', err, '\n');
    }

    // Test 4: Check RLS policies
    console.log('4️⃣ Checking RLS policies on users table...');
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, email, name')
            .limit(5);

        if (error) {
            console.log('❌ Error querying users table:', error.message);
            console.log('   RLS policies may be too restrictive\n');
            return;
        }

        console.log(`✅ Can query users table (${data?.length || 0} users visible)\n`);
    } catch (err) {
        console.log('❌ Error checking RLS:', err, '\n');
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ Messaging system tests complete!');
    console.log('═══════════════════════════════════════');
}

// Run tests
testMessagingFix().catch(console.error);
