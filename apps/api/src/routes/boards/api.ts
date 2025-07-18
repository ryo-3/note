import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, desc } from "drizzle-orm";
import { boards, boardItems, tasks, notes, deletedBoards } from "../../db";
import type { NewBoard, NewBoardItem, NewDeletedBoard } from "../../db/schema/boards";

// スラッグ生成ユーティリティ
function generateSlug(name: string): string {
  // 日本語や特殊文字が含まれる場合は、ランダムな文字列を生成
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // 英数字、スペース、ハイフン以外を除去
    .replace(/\s+/g, '-') // スペースをハイフンに変換
    .replace(/-+/g, '-') // 連続するハイフンを1つに
    .replace(/^-|-$/g, '') // 先頭と末尾のハイフンを除去
    .substring(0, 50); // 最大50文字に制限
  
  // 空文字の場合はランダムな文字列を生成
  if (cleaned.length === 0) {
    return Math.random().toString(36).substring(2, 8);
  }
  
  return cleaned;
}

// ユニークなスラッグを生成
async function generateUniqueSlug(name: string, userId: string, db: any): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 0;
  
  while (true) {
    const existing = await db
      .select()
      .from(boards)
      .where(eq(boards.slug, slug))
      .limit(1);
    
    if (existing.length === 0) {
      return slug;
    }
    
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

const BoardSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  userId: z.string(),
  position: z.number(),
  archived: z.boolean(),
  completed: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const BoardWithStatsSchema = BoardSchema.extend({
  memoCount: z.number(),
  taskCount: z.number(),
});

const CreateBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

const UpdateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

const BoardItemSchema = z.object({
  id: z.number(),
  boardId: z.number(),
  itemType: z.enum(["memo", "task"]),
  itemId: z.number(),
  position: z.number(),
  createdAt: z.number(),
});

const AddItemToBoardSchema = z.object({
  itemType: z.enum(["memo", "task"]),
  itemId: z.number(),
});

export function createAPI(app: any) {
  // ボード一覧取得
  const getBoardsRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["boards"],
    request: {
      query: z.object({
        status: z.enum(["normal", "completed", "deleted"]).optional().default("normal"),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.array(BoardWithStatsSchema),
          },
        },
        description: "Get all boards with statistics",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
    },
  });

  app.openapi(getBoardsRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { status } = c.req.valid("query");
    const db = c.env.db;
    
    let userBoards;
    
    if (status === "deleted") {
      // 削除済みボードを取得
      userBoards = await db
        .select()
        .from(deletedBoards)
        .where(eq(deletedBoards.userId, auth.userId))
        .orderBy(desc(deletedBoards.deletedAt));
    } else {
      // 通常または完了ボードを取得
      const conditions = [
        eq(boards.userId, auth.userId),
        eq(boards.archived, false),
      ];
      
      if (status === "completed") {
        conditions.push(eq(boards.completed, true));
      } else {
        conditions.push(eq(boards.completed, false));
      }
      
      userBoards = await db
        .select()
        .from(boards)
        .where(and(...conditions))
        .orderBy(boards.position, boards.createdAt);
    }

    // 各ボードのメモ・タスク数を計算
    const boardsWithStats = await Promise.all(
      userBoards.map(async (board) => {
        // ボードアイテムを取得
        const items = await db
          .select()
          .from(boardItems)
          .where(eq(boardItems.boardId, board.id));

        // メモとタスクの数をカウント & 最終アクティビティ日時を計算
        let memoCount = 0;
        let taskCount = 0;
        let lastActivityAt = board.updatedAt;

        for (const item of items) {
          if (item.itemType === "memo") {
            // メモが削除されていないか確認（notesテーブルに存在するかチェック）
            const memo = await db
              .select()
              .from(notes)
              .where(
                and(
                  eq(notes.id, item.itemId),
                  eq(notes.userId, auth.userId)
                )
              )
              .limit(1);
            if (memo.length > 0) {
              memoCount++;
              // メモの更新日と比較して最新を保持
              const memoUpdatedAt = typeof memo[0].updatedAt === 'string' 
                ? Math.floor(new Date(memo[0].updatedAt).getTime() / 1000)
                : memo[0].updatedAt;
              if (memoUpdatedAt > lastActivityAt) {
                lastActivityAt = memoUpdatedAt;
              }
            }
          } else {
            // タスクが削除されていないか確認（tasksテーブルに存在するかチェック）
            const task = await db
              .select()
              .from(tasks)
              .where(
                and(
                  eq(tasks.id, item.itemId),
                  eq(tasks.userId, auth.userId)
                )
              )
              .limit(1);
            if (task.length > 0) {
              taskCount++;
              // タスクの更新日と比較して最新を保持
              const taskUpdatedAt = typeof task[0].updatedAt === 'string' 
                ? Math.floor(new Date(task[0].updatedAt).getTime() / 1000)
                : task[0].updatedAt;
              if (taskUpdatedAt > lastActivityAt) {
                lastActivityAt = taskUpdatedAt;
              }
            }
          }
        }

        return {
          ...board,
          memoCount,
          taskCount,
          updatedAt: lastActivityAt, // 最終アクティビティ日時を使用
        };
      })
    );

    return c.json(boardsWithStats);
  });

  // ボード作成
  const createBoardRoute = createRoute({
    method: "post",
    path: "/",
    tags: ["boards"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateBoardSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: BoardSchema,
          },
        },
        description: "Board created",
      },
      400: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Bad request",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
    },
  });

  app.openapi(createBoardRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { name, description } = c.req.valid("json");
    const db = c.env.db;

    // 最大ポジション取得
    const maxPosition = await db
      .select({ maxPos: boards.position })
      .from(boards)
      .where(eq(boards.userId, auth.userId))
      .orderBy(desc(boards.position))
      .limit(1);

    const now = new Date();
    const slug = await generateUniqueSlug(name, auth.userId, db);
    const newBoard: NewBoard = {
      name,
      slug,
      description: description || null,
      userId: auth.userId,
      position: (maxPosition[0]?.maxPos || 0) + 1,
      archived: false,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.insert(boards).values(newBoard).returning();
    return c.json(result[0], 201);
  });

  // ボード更新
  const updateBoardRoute = createRoute({
    method: "put",
    path: "/{id}",
    tags: ["boards"],
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateBoardSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: BoardSchema,
          },
        },
        description: "Board updated",
      },
      400: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Bad request",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not found",
      },
    },
  });

  app.openapi(updateBoardRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = parseInt(c.req.param("id"));
    const updateData = c.req.valid("json");
    const db = c.env.db;

    // ボードの所有権確認
    const board = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.userId, auth.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      return c.json({ error: "Board not found" }, 404);
    }

    const updated = await db
      .update(boards)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(boards.id, boardId))
      .returning();

    return c.json(updated[0]);
  });

  // ボード完了切り替え
  const toggleBoardCompletionRoute = createRoute({
    method: "patch",
    path: "/{id}/toggle-completion",
    tags: ["boards"],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: BoardSchema,
          },
        },
        description: "Board completion toggled",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not found",
      },
    },
  });

  app.openapi(toggleBoardCompletionRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = parseInt(c.req.param("id"));
    const db = c.env.db;

    // ボードの所有権確認
    const board = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.userId, auth.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      return c.json({ error: "Board not found" }, 404);
    }

    const updated = await db
      .update(boards)
      .set({ 
        completed: !board[0].completed,
        updatedAt: new Date() 
      })
      .where(eq(boards.id, boardId))
      .returning();

    return c.json(updated[0]);
  });

  // ボード削除
  const deleteBoardRoute = createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["boards"],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
        description: "Board deleted",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not found",
      },
    },
  });

  app.openapi(deleteBoardRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = parseInt(c.req.param("id"));
    const db = c.env.db;

    // ボードの所有権確認
    const board = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.userId, auth.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      return c.json({ error: "Board not found" }, 404);
    }

    // deleted_boardsテーブルに移動
    const deletedBoard: NewDeletedBoard = {
      id: board[0].id,
      userId: board[0].userId,
      originalId: board[0].id,
      name: board[0].name,
      slug: board[0].slug,
      description: board[0].description,
      position: board[0].position,
      archived: board[0].archived,
      createdAt: typeof board[0].createdAt === 'object' ? Math.floor(board[0].createdAt.getTime() / 1000) : board[0].createdAt,
      updatedAt: typeof board[0].updatedAt === 'object' ? Math.floor(board[0].updatedAt.getTime() / 1000) : board[0].updatedAt,
      deletedAt: Math.floor(Date.now() / 1000),
    };

    // トランザクションで削除済みテーブルに挿入し、元のテーブルから削除
    await db.insert(deletedBoards).values(deletedBoard);
    await db.delete(boards).where(eq(boards.id, boardId));

    return c.json({ success: true });
  });

  // 削除済みボード復元
  const restoreDeletedBoardRoute = createRoute({
    method: "post",
    path: "/restore/{id}",
    tags: ["boards"],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: BoardSchema,
          },
        },
        description: "Board restored",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not found",
      },
    },
  });

  app.openapi(restoreDeletedBoardRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = parseInt(c.req.param("id"));
    const db = c.env.db;

    // 削除済みボードの所有権確認
    const deletedBoard = await db
      .select()
      .from(deletedBoards)
      .where(
        and(
          eq(deletedBoards.originalId, boardId),
          eq(deletedBoards.userId, auth.userId)
        )
      )
      .limit(1);

    if (deletedBoard.length === 0) {
      return c.json({ error: "Deleted board not found" }, 404);
    }

    // 最大ポジション取得
    const maxPosition = await db
      .select({ maxPos: boards.position })
      .from(boards)
      .where(eq(boards.userId, auth.userId))
      .orderBy(desc(boards.position))
      .limit(1);

    // 新しいスラッグを生成（重複を避けるため）
    const newSlug = await generateUniqueSlug(deletedBoard[0].name, auth.userId, db);

    // boardsテーブルに復元
    const restoredBoard: NewBoard = {
      name: deletedBoard[0].name,
      slug: newSlug,
      description: deletedBoard[0].description,
      userId: deletedBoard[0].userId,
      position: (maxPosition[0]?.maxPos || 0) + 1,
      archived: deletedBoard[0].archived,
      completed: false, // 復元時は未完了に設定
      createdAt: new Date(deletedBoard[0].createdAt * 1000),
      updatedAt: new Date(),
    };

    const result = await db.insert(boards).values(restoredBoard).returning();
    await db.delete(deletedBoards).where(eq(deletedBoards.originalId, boardId));

    return c.json(result[0]);
  });

  // スラッグからボード取得
  const getBoardBySlugRoute = createRoute({
    method: "get",
    path: "/slug/{slug}",
    tags: ["boards"],
    request: {
      params: z.object({
        slug: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: BoardSchema,
          },
        },
        description: "Board found",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Board not found",
      },
    },
  });

  app.openapi(getBoardBySlugRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { slug } = c.req.valid("param");
    const db = c.env.db;

    const board = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.slug, slug),
          eq(boards.userId, auth.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      return c.json({ error: "Board not found" }, 404);
    }

    return c.json(board[0]);
  });

  // ボード内アイテム取得
  const getBoardItemsRoute = createRoute({
    method: "get",
    path: "/{id}/items",
    tags: ["boards"],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              board: BoardSchema,
              items: z.array(z.object({
                id: z.number(),
                itemType: z.enum(["memo", "task"]),
                itemId: z.number(),
                position: z.number(),
                content: z.any(), // メモまたはタスクの内容
              })),
            }),
          },
        },
        description: "Get board with items",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not found",
      },
    },
  });

  app.openapi(getBoardItemsRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = parseInt(c.req.param("id"));
    const db = c.env.db;

    // ボードの取得と所有権確認
    const board = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.userId, auth.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      return c.json({ error: "Board not found" }, 404);
    }

    // ボードアイテムの取得
    const items = await db
      .select()
      .from(boardItems)
      .where(eq(boardItems.boardId, boardId))
      .orderBy(boardItems.position);

    // アイテムの内容を取得
    const itemsWithContent = await Promise.all(
      items.map(async (item) => {
        let content;
        if (item.itemType === "memo") {
          const memo = await db
            .select()
            .from(notes)
            .where(and(eq(notes.id, item.itemId), eq(notes.userId, auth.userId)))
            .limit(1);
          content = memo[0] || null;
        } else {
          const task = await db
            .select()
            .from(tasks)
            .where(and(eq(tasks.id, item.itemId), eq(tasks.userId, auth.userId)))
            .limit(1);
          content = task[0] || null;
        }

        return {
          id: item.id,
          itemType: item.itemType,
          itemId: item.itemId,
          position: item.position,
          content,
        };
      })
    );

    // 削除されたアイテムを除外
    const validItems = itemsWithContent.filter(item => item.content !== null);

    return c.json({
      board: board[0],
      items: validItems,
    });
  });

  // ボードにアイテム追加
  const addItemToBoardRoute = createRoute({
    method: "post",
    path: "/{id}/items",
    tags: ["boards"],
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: AddItemToBoardSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: BoardItemSchema,
          },
        },
        description: "Item added to board",
      },
      400: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Bad request",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not found",
      },
    },
  });

  app.openapi(addItemToBoardRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = parseInt(c.req.param("id"));
    const { itemType, itemId } = c.req.valid("json");
    const db = c.env.db;

    // ボードの所有権確認
    const board = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.userId, auth.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      return c.json({ error: "Board not found" }, 404);
    }

    // アイテムの存在確認と所有権確認
    if (itemType === "memo") {
      const memo = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, itemId), eq(notes.userId, auth.userId)))
        .limit(1);
      if (memo.length === 0) {
        return c.json({ error: "Memo not found" }, 404);
      }
    } else {
      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, itemId), eq(tasks.userId, auth.userId)))
        .limit(1);
      if (task.length === 0) {
        return c.json({ error: "Task not found" }, 404);
      }
    }

    // 重複チェック
    const existing = await db
      .select()
      .from(boardItems)
      .where(
        and(
          eq(boardItems.boardId, boardId),
          eq(boardItems.itemType, itemType),
          eq(boardItems.itemId, itemId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "Item already exists in board" }, 400);
    }

    // 最大ポジション取得
    const maxPosition = await db
      .select({ maxPos: boardItems.position })
      .from(boardItems)
      .where(eq(boardItems.boardId, boardId))
      .orderBy(desc(boardItems.position))
      .limit(1);

    const newItem: NewBoardItem = {
      boardId,
      itemType,
      itemId,
      position: (maxPosition[0]?.maxPos || 0) + 1,
      createdAt: new Date(),
    };

    const result = await db.insert(boardItems).values(newItem).returning();
    
    // ボードのupdatedAtを更新
    await db
      .update(boards)
      .set({ updatedAt: new Date() })
      .where(eq(boards.id, boardId));
    
    return c.json(result[0], 201);
  });

  // ボードからアイテム削除
  const removeItemFromBoardRoute = createRoute({
    method: "delete",
    path: "/{id}/items/{itemId}",
    tags: ["boards"],
    request: {
      params: z.object({
        id: z.string(),
        itemId: z.string(),
      }),
      query: z.object({
        itemType: z.enum(["memo", "task"]),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
        description: "Item removed from board",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not found",
      },
    },
  });

  app.openapi(removeItemFromBoardRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const boardId = parseInt(c.req.param("id"));
    const itemId = parseInt(c.req.param("itemId"));
    const { itemType } = c.req.valid("query");
    const db = c.env.db;

    // ボードの所有権確認
    const board = await db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.id, boardId),
          eq(boards.userId, auth.userId)
        )
      )
      .limit(1);

    if (board.length === 0) {
      return c.json({ error: "Board not found" }, 404);
    }

    // アイテムを削除
    const result = await db
      .delete(boardItems)
      .where(
        and(
          eq(boardItems.boardId, boardId),
          eq(boardItems.itemType, itemType),
          eq(boardItems.itemId, itemId)
        )
      );

    if (result.changes === 0) {
      return c.json({ error: "Item not found in board" }, 404);
    }

    // ボードのupdatedAtを更新
    await db
      .update(boards)
      .set({ updatedAt: new Date() })
      .where(eq(boards.id, boardId));

    return c.json({ success: true });
  });

  // アイテムが属するボード一覧を取得
  const getItemBoardsRoute = createRoute({
    method: "get",
    path: "/items/{itemType}/{itemId}/boards",
    request: {
      params: z.object({
        itemType: z.enum(["memo", "task"]),
        itemId: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.array(BoardSchema),
          },
        },
        description: "Item boards retrieved successfully",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Item not found",
      },
    },
  });

  app.openapi(getItemBoardsRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { itemType, itemId } = c.req.valid("param");
    const itemIdNum = parseInt(itemId);
    const db = c.env.db;

    // アイテムの存在確認と所有権確認
    if (itemType === "memo") {
      const memo = await db
        .select()
        .from(notes)
        .where(and(eq(notes.id, itemIdNum), eq(notes.userId, auth.userId)))
        .limit(1);

      if (memo.length === 0) {
        return c.json({ error: "Memo not found" }, 404);
      }
    } else {
      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, itemIdNum), eq(tasks.userId, auth.userId)))
        .limit(1);

      if (task.length === 0) {
        return c.json({ error: "Task not found" }, 404);
      }
    }

    // アイテムが属するボードを取得
    const itemBoards = await db
      .select()
      .from(boards)
      .innerJoin(boardItems, eq(boards.id, boardItems.boardId))
      .where(
        and(
          eq(boardItems.itemType, itemType),
          eq(boardItems.itemId, itemIdNum),
          eq(boards.userId, auth.userId)
        )
      )
      .orderBy(boards.name);

    // レスポンスの形式を整える
    const boardsOnly = itemBoards.map(row => row.boards);
    return c.json(boardsOnly);
  });

  return app;
}