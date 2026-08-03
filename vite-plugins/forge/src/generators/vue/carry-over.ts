/**
 * Carried-over top-level statement emission for the Vue module emitter.
 *
 * A neutral component module carries top-level helpers, types, and constants
 * alongside the component function. These ride into the emitted SFC verbatim —
 * except the **props interface**, whose members are pruned to exactly those the
 * emitted `defineProps<{ … }>()` declares, keeping the component's public props
 * type in lock-step with its actual runtime props.
 */
import ts from 'typescript';

import { printNode } from '../../compiler/ast.js';

/**
 * Print the top-level helper / type statements carried over verbatim — except
 * the **props interface**, whose members are pruned to exactly those the emitted
 * `defineProps<{ … }>()` declares. Event props (`on<Event>`) and node-typed slot
 * props are declared via `defineEmits` / rendered as slots rather than carried as
 * runtime props, so leaving them on the interface would make the component's
 * public props type disagree with its actual `defineProps`; dropping them keeps
 * the two in lock-step.
 */
export function buildCarryOver(
  sourceFile: ts.SourceFile,
  componentName: string,
  propertiesType: string | undefined,
  droppedPropNames: Set<string>,
): string {
  const kept: string[] = [];
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      continue;
    }
    if (ts.isFunctionDeclaration(statement) && statement.name?.text === componentName) {
      continue;
    }
    if (ts.isInterfaceDeclaration(statement) && statement.name.text === propertiesType && droppedPropNames.size > 0) {
      const members = statement.members.filter(
        (member) =>
          !(ts.isPropertySignature(member) && ts.isIdentifier(member.name) && droppedPropNames.has(member.name.text)),
      );
      kept.push(
        printNode(
          ts.factory.updateInterfaceDeclaration(
            statement,
            statement.modifiers,
            statement.name,
            statement.typeParameters,
            statement.heritageClauses,
            members,
          ),
          sourceFile,
        ),
      );
      continue;
    }
    kept.push(printNode(statement, sourceFile));
  }
  return kept.join('\n\n');
}
