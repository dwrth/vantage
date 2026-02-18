"use client";

import React, { useState } from "react";
import { ComponentRegistry } from "@vantage/page-builder";

// Example: Simple Button Component
export const CustomButton = ({
  label,
  color,
  onClick,
}: {
  label?: string;
  color?: string;
  onClick?: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 24px",
        background: color || "#2563eb",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "16px",
        fontWeight: 600,
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {label || "Click Me"}
    </button>
  );
};

// Example: Card Component with Image and Text
export const CustomCard = ({
  title,
  description,
  imageUrl,
}: {
  title?: string;
  description?: string;
  imageUrl?: string;
}) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          style={{
            width: "100%",
            height: "200px",
            objectFit: "cover",
          }}
        />
      )}
      <div
        style={{
          padding: "16px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        {title && (
          <h3
            style={{ margin: "0 0 8px 0", fontSize: "20px", fontWeight: 600 }}
          >
            {title}
          </h3>
        )}
        {description && (
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

// Example: Counter Component (with internal state)
export const Counter = ({ initialValue }: { initialValue?: number }) => {
  const [count, setCount] = useState(initialValue || 0);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        background: "#f9fafb",
        borderRadius: "8px",
        padding: "20px",
      }}
    >
      <div style={{ fontSize: "48px", fontWeight: "bold", color: "#2563eb" }}>
        {count}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={() => setCount(count - 1)}
          style={{
            padding: "8px 16px",
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          -
        </button>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            padding: "8px 16px",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>
    </div>
  );
};

// Example: Form Component
export const CustomForm = ({ title }: { title?: string }) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "24px",
        background: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      {title && (
        <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 600 }}>
          {title}
        </h2>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          flex: 1,
        }}
      >
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{
            padding: "12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            padding: "12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        />
        <button
          onClick={() => alert(`Submitted: ${name} - ${email}`)}
          style={{
            padding: "12px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: 600,
            marginTop: "auto",
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
};

// Example: Badge/Alert Component
export const Alert = ({
  message,
  type,
}: {
  message?: string;
  type?: "success" | "error" | "info";
}) => {
  const colors = {
    success: { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
    error: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
    info: { bg: "#dbeafe", border: "#2563eb", text: "#1e40af" },
  };

  const color = colors[type || "info"];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "16px",
        background: color.bg,
        border: `2px solid ${color.border}`,
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        color: color.text,
        fontSize: "14px",
        fontWeight: 500,
      }}
    >
      {message || "This is an alert message"}
    </div>
  );
};

// Example: Todo List Component (with state management)
export const TodoList = ({ title }: { title?: string }) => {
  const [todos, setTodos] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, inputValue.trim()]);
      setInputValue("");
    }
  };

  const removeTodo = (index: number) => {
    setTodos(todos.filter((_, i) => i !== index));
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "20px",
        background: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <h3 style={{ margin: "0 0 16px 0", fontSize: "20px", fontWeight: 600 }}>
        {title || "Todo List"}
      </h3>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyPress={e => e.key === "Enter" && addTodo()}
          placeholder="Add a todo..."
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            fontSize: "14px",
          }}
        />
        <button
          onClick={addTodo}
          style={{
            padding: "8px 16px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Add
        </button>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {todos.length === 0 ? (
          <p
            style={{ color: "#9ca3af", textAlign: "center", marginTop: "20px" }}
          >
            No todos yet. Add one above!
          </p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {todos.map((todo, index) => (
              <li
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px",
                  marginBottom: "8px",
                  background: "#f9fafb",
                  borderRadius: "6px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <span style={{ flex: 1, fontSize: "14px" }}>{todo}</span>
                <button
                  onClick={() => removeTodo(index)}
                  style={{
                    padding: "4px 8px",
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// Export component registry
export const customComponents: ComponentRegistry<
  "button" | "card" | "counter" | "form" | "alert" | "todo"
> = {
  button: CustomButton,
  card: CustomCard,
  counter: Counter,
  form: CustomForm,
  alert: Alert,
  todo: TodoList,
};
