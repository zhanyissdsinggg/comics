#!/usr/bin/env python3
"""
自动修复TypeScript未使用参数错误的脚本
"""
import re
import os
import subprocess

def get_errors():
    """获取所有编译错误"""
    result = subprocess.run(
        ['npm', 'run', 'build'],
        cwd='.',
        capture_output=True,
        text=True
    )
    output = result.stdout + result.stderr

    errors = []
    for line in output.split('\n'):
        if 'error TS6133' in line:
            # 解析错误信息
            match = re.search(r"src/(.+?):(\d+):(\d+).*'(.+?)' is declared", line)
            if match:
                file_path = match.group(1)
                line_num = int(match.group(2))
                col_num = int(match.group(3))
                var_name = match.group(4)
                errors.append({
                    'file': f'src/{file_path}',
                    'line': line_num,
                    'col': col_num,
                    'var': var_name
                })

    return errors

def fix_file(file_path, errors):
    """修复单个文件中的所有错误"""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # 按行号倒序排列，这样修改不会影响后续行号
    file_errors = sorted(errors, key=lambda x: x['line'], reverse=True)

    for error in file_errors:
        line_idx = error['line'] - 1
        var_name = error['var']

        if line_idx < len(lines):
            line = lines[line_idx]

            # 替换未使用的参数
            # 处理各种情况：函数参数、装饰器参数等
            patterns = [
                # 函数参数：(param: Type) -> (_param: Type)
                (rf'\b{re.escape(var_name)}\s*:', f'_{var_name}:'),
                # 导入：import { Unused } -> 删除导入
                (rf'import\s*{{\s*{re.escape(var_name)}\s*}}\s*from', f'// import {{ {var_name} }} from'),
            ]

            for pattern, replacement in patterns:
                if re.search(pattern, line):
                    lines[line_idx] = re.sub(pattern, replacement, line)
                    break

    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

def main():
    """主函数"""
    print("获取编译错误...")
    errors = get_errors()

    if not errors:
        print("✅ 没有未使用参数错误！")
        return

    print(f"找到 {len(errors)} 个错误")

    # 按文件分组
    errors_by_file = {}
    for error in errors:
        file_path = error['file']
        if file_path not in errors_by_file:
            errors_by_file[file_path] = []
        errors_by_file[file_path].append(error)

    # 修复每个文件
    for file_path, file_errors in errors_by_file.items():
        print(f"修复 {file_path} ({len(file_errors)} 个错误)...")
        if os.path.exists(file_path):
            fix_file(file_path, file_errors)
        else:
            print(f"  ⚠️ 文件不存在: {file_path}")

    print("✅ 修复完成！")

if __name__ == '__main__':
    main()
