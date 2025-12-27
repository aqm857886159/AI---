/**
 * 时光机预览和点击功能测试工具
 * 使用方法：在浏览器控制台粘贴并运行此脚本
 */

console.log('🔧 === 时光机功能测试工具 ===');

// 1. 检查修订段落
const revisionParagraphs = document.querySelectorAll('[data-revision-id]');
console.log(`\n✓ 找到 ${revisionParagraphs.length} 个修订段落`);

if (revisionParagraphs.length === 0) {
    console.error('❌ 没有修订段落! 请先触发 AI 改写。');
} else {
    revisionParagraphs.forEach((para, i) => {
        const id = para.getAttribute('data-revision-id');
        console.log(`  段落 ${i + 1}: ID = ${id}`);
        console.log(`    类名: ${para.className}`);
    });
}

// 2. 检查按钮
const acceptButtons = document.querySelectorAll('.revision-btn.accept');
const rejectButtons = document.querySelectorAll('.revision-btn.reject');
console.log(`\n✓ 找到 ${acceptButtons.length} 个接受按钮`);
console.log(`✓ 找到 ${rejectButtons.length} 个拒绝按钮`);

// 3. 测试预览功能
if (revisionParagraphs.length > 0) {
    const testId = revisionParagraphs[0].getAttribute('data-revision-id');
    console.log(`\n🧪 测试预览功能 (使用 ID: ${testId})`);

    // 测试绿光预览
    console.log('\n  测试 1: 绿光预览 (future)');
    window.dispatchEvent(new CustomEvent('preview-change', {
        detail: { changeId: testId, type: 'future', active: true }
    }));

    setTimeout(() => {
        const element = document.querySelector(`[data-revision-id="${testId}"]`);
        const hasFutureClass = element?.classList.contains('preview-future');
        console.log(`    ${hasFutureClass ? '✅' : '❌'} 绿光预览类已${hasFutureClass ? '应用' : '未应用'}`);

        // 取消绿光
        window.dispatchEvent(new CustomEvent('preview-change', {
            detail: { changeId: testId, type: 'future', active: false }
        }));

        setTimeout(() => {
            const stillHasFuture = element?.classList.contains('preview-future');
            console.log(`    ${!stillHasFuture ? '✅' : '❌'} 绿光预览类已${!stillHasFuture ? '移除' : '未移除'}`);

            // 测试灰显预览
            console.log('\n  测试 2: 灰显预览 (past)');
            window.dispatchEvent(new CustomEvent('preview-change', {
                detail: { changeId: testId, type: 'past', active: true }
            }));

            setTimeout(() => {
                const hasPastClass = element?.classList.contains('preview-past');
                console.log(`    ${hasPastClass ? '✅' : '❌'} 灰显预览类已${hasPastClass ? '应用' : '未应用'}`);

                // 取消灰显
                window.dispatchEvent(new CustomEvent('preview-change', {
                    detail: { changeId: testId, type: 'past', active: false }
                }));

                setTimeout(() => {
                    const stillHasPast = element?.classList.contains('preview-past');
                    console.log(`    ${!stillHasPast ? '✅' : '❌'} 灰显预览类已${!stillHasPast ? '移除' : '未移除'}`);
                }, 100);
            }, 100);
        }, 100);
    }, 100);
}

// 4. 监听所有事件
console.log('\n📡 开始监听事件...');
let eventCount = 0;

const monitorEvent = (eventName) => {
    window.addEventListener(eventName, (e) => {
        eventCount++;
        console.log(`🎯 事件 #${eventCount}: ${eventName}`, e.detail);
    });
};

monitorEvent('preview-change');
monitorEvent('accept-paragraph-change');
monitorEvent('reject-paragraph-change');

// 5. 提供手动测试函数
window.testPreview = (changeId, type = 'future') => {
    console.log(`\n🧪 手动测试: changeId=${changeId}, type=${type}`);
    const event = new CustomEvent('preview-change', {
        detail: { changeId, type, active: true }
    });
    window.dispatchEvent(event);

    setTimeout(() => {
        const element = document.querySelector(`[data-revision-id="${changeId}"]`);
        console.log('元素状态:', {
            classList: element?.className,
            hasFuture: element?.classList.contains('preview-future'),
            hasPast: element?.classList.contains('preview-past')
        });
    }, 100);
};

console.log('\n📋 使用说明:');
console.log('1. 悬停到 ✓ 或 ✗ 按钮上测试预览');
console.log('2. 点击按钮测试接受/拒绝');
console.log('3. 观察控制台输出的事件日志');
console.log('4. 手动测试: testPreview("REVISION_ID", "future" | "past")');
console.log('\n✅ 测试工具已准备就绪!');
