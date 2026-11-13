/**
 * Formal EBNF grammar definition of the Flint language.
 */
export const FLINT_EBNF_GRAMMAR = `
Module              ::= ( ImportDecl | ExportDecl | TopLevelDecl )* ;

ImportDecl          ::= CapabilityImport | SourceImport ;
CapabilityImport    ::= "import" "capability" StringLiteral "as" Identifier "(" ParamList? ")" "->" TypeExpr ";" ;
SourceImport        ::= "import" ( "module" )? StringLiteral "as" Identifier ";" ;

ExportDecl          ::= "export" ( FunctionDecl | StructDecl | EnumDecl | InterfaceDecl | TraitDecl ) ;

TopLevelDecl        ::= FunctionDecl
                      | StructDecl
                      | EnumDecl
                      | InterfaceDecl
                      | TraitDecl
                      | TypeAliasDecl
                      | ConstDecl
                      | MacroDecl
                      | ComptimeStmt ;

MacroDecl           ::= ( "macro" | "derive" ) Identifier "(" ParamList? ")" Block ;
AttributeAnnotation ::= ( "@" Identifier ( "(" ExprList? ")" )? )
                      | ( "#" "[" Identifier ( "(" AttributeArgList? ")" )? "]" ) ;
AttributeArgList    ::= AttributeArg ( "," AttributeArg )* ;
AttributeArg        ::= Identifier | IntegerLiteral | StringLiteral | Expr ;

FunctionDecl        ::= AttributeAnnotation* ( "export" )? ( "iter" )? ( "inline" | "noinline" )? "fn" Identifier ( "<" TypeParamList ">" )? "(" ParamList? ")" ( "->" TypeExpr )? ( Block | ";" ) ;
ParamList           ::= Param ( "," Param )* ;
Param               ::= ( "mut" )? Identifier ":" TypeExpr ;

StructDecl          ::= AttributeAnnotation* ( "struct" | "record" ) Identifier ( "<" TypeParamList ">" )? "{" ( StructField ( ( "," | ";" ) StructField )* ( "," | ";" )? )? "}" ;
StructField         ::= Identifier ":" TypeExpr ;

EnumDecl            ::= AttributeAnnotation* ( "export" )? "enum" Identifier ( "<" TypeParamList ">" )? "{" ( EnumVariant ( "," EnumVariant )* ","? )? "}" ;
EnumVariant         ::= Identifier ( "(" VariantFieldList ")" )? ( "=" ( "-" )? IntegerLiteral )? ;
VariantFieldList    ::= VariantField ( "," VariantField )* ;
VariantField        ::= ( Identifier ":" )? TypeExpr ;

InterfaceDecl       ::= AttributeAnnotation* "interface" Identifier ( "<" TypeParamList ">" )? "{" ( MethodSignature ";" )* "}" ;
MethodSignature     ::= "fn" Identifier ( "<" TypeParamList ">" )? "(" ParamList? ")" ( "->" TypeExpr )? ;

TraitDecl           ::= "trait" Identifier ( "<" TypeParamList ">" )? ( ":" TraitBounds )? "{" ( MethodSignature ";" )* "}" ;
TypeAliasDecl       ::= "type" Identifier ( "<" TypeParamList ">" )? "=" TypeExpr ";" ;
ConstDecl           ::= "const" Identifier ":" TypeExpr "=" Expr ";" ;

TypeExpr            ::= PrimitiveType
                      | NominalType
                      | ArrayType
                      | ReferenceType
                      | FunctionType
                      | TupleType ;

PrimitiveType       ::= "i8" | "i32" | "i64" | "u8" | "u32" | "u64" | "f32" | "f64" | "bool" | "unit" | "string" | "bytes" ;
NominalType         ::= Identifier ( "<" TypeArgumentList ">" )? ;
ArrayType           ::= "[" TypeExpr ";" IntegerLiteral "]" | "[" TypeExpr "]" ;
ReferenceType       ::= ( "&" | "&mut" ) TypeExpr ;
FunctionType        ::= "fn" "(" TypeList? ")" ( "->" TypeExpr )? ;
TupleType           ::= "(" TypeList? ")" ;

TypeParamList       ::= TypeParam ( "," TypeParam )* ;
TypeParam           ::= Identifier ( ":" TraitBounds )? ;
TraitBounds         ::= Identifier ( "+" Identifier )* ;
TypeArgumentList    ::= TypeExpr ( "," TypeExpr )* ;
TypeList            ::= TypeExpr ( "," TypeExpr )* ;

Block               ::= "{" Stmt* "}" ;

Stmt                ::= LetStmt
                      | AssignStmt
                      | ReturnStmt
                      | YieldStmt
                      | IfStmt
                      | WhileStmt
                      | LoopStmt
                      | DoWhileStmt
                      | ForStmt
                      | MatchStmt
                      | SwitchStmt
                      | ComptimeStmt
                      | ExprStmt ;

LetStmt             ::= "let" ( "mut" )? Identifier ":" TypeExpr "=" Expr ";" ;
AssignStmt          ::= ( Identifier | IndexExpr ) "=" Expr ";" ;
ReturnStmt          ::= "return" ( Expr )? ";" ;
YieldStmt           ::= "yield" Expr ";" ;
IfStmt              ::= "if" ( "likely" | "unlikely" )? Expr Block ( "else" Block )? ;
WhileStmt           ::= "while" Expr Block ;
LoopStmt            ::= "loop" Identifier "=" Expr Block ;
DoWhileStmt         ::= "do" Block "while" Expr ";" ;
ForStmt             ::= "for" "(" ( LetStmt | AssignStmt | Expr )? ";" Expr? ";" ( AssignStmt | Expr )? ")" Block ;
MatchStmt           ::= "match" Expr "{" ( ( "case" )? Pattern "=>" Stmt* )* "}" ;
SwitchStmt          ::= "switch" Expr "{" ( "case" SwitchCaseValue ":" ( Stmt* | Block ) )* ( "default" ":" ( Stmt* | Block ) )? "}" ;
ComptimeStmt        ::= "comptime" Block ;
ExprStmt            ::= Expr ";" ;

Expr                ::= PipelineExpr ;
PipelineExpr        ::= LogicalOrExpr ( "|>" LogicalOrExpr )* ;
LogicalOrExpr       ::= LogicalAndExpr ( "||" LogicalAndExpr )* ;
LogicalAndExpr      ::= EqualityExpr ( "&&" EqualityExpr )* ;
EqualityExpr        ::= RelationalExpr ( ( "==" | "!=" ) RelationalExpr )* ;
RelationalExpr      ::= AdditiveExpr ( ( "<" | "<=" | ">" | ">=" ) AdditiveExpr )* ;
AdditiveExpr        ::= MultiplicativeExpr ( ( "+" | "-" ) MultiplicativeExpr )* ;
MultiplicativeExpr  ::= UnaryExpr ( ( "*" | "/" | "%" ) UnaryExpr )* ;
UnaryExpr           ::= ( "!" | "-" | "*" | "&" | "&mut" | "?" )? PostfixExpr ;
PostfixExpr         ::= PrimaryExpr ( ( "(" ArgList? ")" ) | ( "[" Expr "]" ) | ( "." Identifier ( "(" ArgList? ")" )? ) )* ;
PrimaryExpr         ::= Literal
                      | Identifier ( "::" Identifier ( "(" ArgList? ")" )? )?
                      | "(" Expr ")"
                      | "[" ExprList? "]"
                      | "vector" "[" ExprList? "]"
                      | StructLiteral
                      | MatchExpr
                      | ComptimeExpr ;

StructLiteral       ::= Identifier "{" ( FieldInit ( "," FieldInit )* ","? )? "}" ;
FieldInit           ::= Identifier ":" Expr ;
MatchExpr           ::= "match" Expr "{" ( ( "case" )? Pattern "=>" Expr ( "," )? )* "}" ;
ComptimeExpr        ::= "comptime" ( Block | Expr ) ;
ArgList             ::= Expr ( "," Expr )* ;
ExprList            ::= Expr ( "," Expr )* ;

Pattern             ::= "_"
                      | Literal
                      | Identifier ( "::" Identifier )? ( "(" ( PatternBinding ( "," PatternBinding )* )? ")" )? ;
PatternBinding      ::= Identifier ;
SwitchCaseValue     ::= ( "-" )? IntegerLiteral | Identifier ;

Literal             ::= IntegerLiteral | FloatLiteral | StringLiteral | "true" | "false" ;
`.trim();

/**
 * Validates whether a grammar production rule name is well-formed according to Flint grammar specs.
 */
export function isGrammarProductionRule(ruleName: string): boolean {
  return /^[A-Z][A-Za-z0-9_]*$/u.test(ruleName);
}
