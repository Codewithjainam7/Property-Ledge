import re

def main():
    try:
        with open('src/components/Accounting.tsx', 'r', encoding='utf-8') as f:
            content = f.read()

        # 1. Remove Actions header
        content = content.replace('<th className="px-4 py-2.5 text-[10px] font-bold text-[#a9927d] uppercase tracking-wider text-right">Actions</th>', '')

        # 2. Remove Actions cell
        actions_cell = """                            {/* Actions */}
                            <td className={`px-4 ${rowPy} text-right`} onClick={e => e.stopPropagation()}>
                              <button onClick={() => { setPanelRow(row); setPanelTab('details'); }} className="p-1 rounded hover:bg-[#f2f4f3] transition-colors" title="Open panel">
                                <PanelRightOpen className="w-3.5 h-3.5 text-[#a9927d]" />
                              </button>
                            </td>"""
        content = content.replace(actions_cell, '')

        with open('src/components/Accounting.tsx', 'w', encoding='utf-8') as f:
            f.write(content)

        print("Actions column removed.")

    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    main()
