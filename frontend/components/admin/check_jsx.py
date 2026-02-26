import re

with open('AdminBillingPage.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到return语句的起始行
return_start = None
for i, line in enumerate(lines):
    if 'return (' in line:
        return_start = i
        break

if return_start is None:
    print("未找到return语句")
    exit(1)

# 从return开始到文件末尾
jsx_lines = lines[return_start:]

# 简单的标签匹配
stack = []
for i, line in enumerate(jsx_lines, start=return_start+1):
    # 找开标签
    open_tags = re.findall(r'<([a-zA-Z_][a-zA-Z0-9_]*)[^/>]*(?<!/)>', line)
    for tag in open_tags:
        stack.append((tag, i))
    
    # 找闭标签
    close_tags = re.findall(r'</([a-zA-Z_][a-zA-Z0-9_]*)>', line)
    for tag in close_tags:
        if stack and stack[-1][0] == tag:
            stack.pop()
        else:
            print(f"第{i}行：多余的闭标签 </{tag}>")

print(f"\n未闭合的开标签：")
for tag, line_num in stack:
    print(f"第{line_num}行：<{tag}>")
