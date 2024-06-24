'use server';

import { db } from '@/firebaseConfig';
import { convertTagsFtoB } from '@/lib/convert-tags';
import { FilterOptions, ResourceType } from '@/types/resource';
import {
  DocumentData,
  QuerySnapshot,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from '@firebase/firestore';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const ResourceSchema = z.object({
  title: z
    .string()
    .min(30, 'Minimum 30 characters required')
    .max(50, 'Title length is more than maximum'),
  description: z
    .string()
    .min(200, 'Minimum 300 characters required')
    .max(300, 'Description length is more than maximum'),
  link: z.string().url('Invalid URL format'),
  tags: z.array(z.string()).nonempty('At least one tag is required'),
  isVerified: z.boolean().default(false),
  author: z.string().min(3, 'Minimum 3 characters required'),
  email: z.string().email('Invalid Valid Gmail Address').endsWith('@gmail.com'),
  github: z
    .string()
    .url('Invalid Github Profile URL')
    .startsWith('https://www.github.com/'),
});

enum FormFields {
  Button = 'button',
  Title = 'title',
  Description = 'description',
  Link = 'link',
  Tags = 'tags',
  IsVerified = 'isVerified',
  Author = 'author',
  Email = 'email',
  Github = 'github',
}

const ResourceStr = 'resources';
const TagStr = 'tags';

type State = {
  errors?: {
    link?: string[];
    title?: string[];
    description?: string[];
    tags?: string[];
    author?: string[];
    email?: string[];
    github?: string[];
  };
  message?: string;
};

export async function addResourceAction(
  selectedTags: string[],
  prevState: State,
  formData: FormData,
): Promise<State> {
  const author = formData.get(FormFields.Author) as string;
  const email = formData.get(FormFields.Email) as string;
  const github = formData.get(FormFields.Github) as string;
  const title = formData.get(FormFields.Title) as string;
  const description = formData.get(FormFields.Description) as string;
  const link = formData.get(FormFields.Link) as string;
  const tags = convertTagsFtoB(selectedTags);

  const result = ResourceSchema.safeParse({
    title,
    description,
    link,
    tags,
    author,
    email,
    github,
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const batch = writeBatch(db);

  try {
    const resourceRef = doc(collection(db, ResourceStr));
    batch.set(resourceRef, {
      title,
      description,
      link,
      tags,
      isVerified: false,
      author: {
        name: author,
        email: email,
        github: github,
      },
    });

    for (const tg of tags) {
      const tagDocRef = doc(db, TagStr, tg);
      batch.update(tagDocRef, { docId: arrayUnion(resourceRef) });
    }

    await batch.commit();
  } catch (error) {
    console.error('Firebase Error:', error);
    return { message: 'Firebase Error: Failed to add resource.' };
  }

  redirect('/admin/dashboard');
}

export async function editResourceAction(
  selectedTags: string[],
  id: string,
  prevState: State,
  formData: FormData,
): Promise<State> {
  const title = formData.get(FormFields.Title) as string;
  const description = formData.get(FormFields.Description) as string;
  const link = formData.get(FormFields.Link) as string;
  const newTags = convertTagsFtoB(selectedTags);
  const isVerified = formData.get(FormFields.IsVerified);

  const result = ResourceSchema.safeParse({
    title,
    description,
    link,
    tags: newTags,
    isVerified: isVerified,
  });

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  const batch = writeBatch(db);

  try {
    const prevRes = await getResourceAction(id);

    if (!prevRes) {
      return { message: 'Edit: No specified document found' };
    }

    const resourceRef = doc(db, ResourceStr, id);

    batch.update(resourceRef, {
      title,
      description,
      link,
      tags: newTags,
      isVerified: isVerified,
    });

    const removedTags = difference(prevRes.tags, newTags);
    const addedTags = difference(newTags, prevRes.tags);

    for (const tag of removedTags) {
      const tagDocRef = doc(db, TagStr, tag);
      batch.update(tagDocRef, { docId: arrayRemove(resourceRef) });
    }

    for (const tag of addedTags) {
      const tagDocRef = doc(db, TagStr, tag);
      batch.update(tagDocRef, { docId: arrayUnion(resourceRef) });
    }

    await batch.commit();
  } catch (error) {
    console.error('Firebase Error:', error);
    return { message: 'Firebase Error: Failed to edit resource.' };
  }

  redirect('/admin/dashboard');
}

function difference(a: string[], b: string[]) {
  const setB = new Set(b);
  return a.filter((x) => !setB.has(x));
  /**
   * Above code has complexity O(1) then arr.inludes() which has O(n)
   */
}

export async function deleteResourceAction(id: string) {
  const batch = writeBatch(db);

  try {
    const resourceRef = doc(db, ResourceStr, id);
    const res = await getResourceAction(id);

    if (!res) {
      return { error: 'Delete: No specified document found.' };
    }

    for (const tg of res.tags) {
      const tagDocRef = doc(db, TagStr, tg);
      batch.update(tagDocRef, { docId: arrayRemove(resourceRef) });
    }

    batch.delete(resourceRef);

    await batch.commit();
  } catch (error) {
    return { error: 'Failed to delete resource' };
  }

  revalidatePath('/admin/dashboard');
}

export async function getResourceAction(
  id: string,
): Promise<ResourceType | null> {
  try {
    const resourceRef = doc(db, ResourceStr, id);
    const docSnap = await getDoc(resourceRef);
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();

    return {
      id: docSnap.id,
      title: data['title'],
      description: data['description'],
      link: data['link'],
      tags: data['tags'],
      isVerified: data['isVerified'],
      author: {
        name: data['author']['name'],
        email: data['author']['email'],
        github: data['author']['github'],
        avatar: data['author']['avatar'],
      },
    };
  } catch (error) {
    return null;
  }
}

export async function getAllResources(
  filter: FilterOptions = FilterOptions.All,
) {
  try {
    let querySnapshot;
    filter === FilterOptions.All
      ? (querySnapshot = await getDocs(collection(db, ResourceStr)))
      : (querySnapshot = await getDocs(
          query(
            collection(db, ResourceStr),
            where('isVerified', '==', filter === FilterOptions.Verified),
          ),
        ));
    if (querySnapshot.empty) {
      return null;
    }

    const resources: ResourceType[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      resources.push({
        id: doc.id,
        title: data['title'] as string,
        description: data['description'] as string,
        link: data['link'] as string,
        tags: data['tags'] as string[],
        isVerified: data['isVerified'] as boolean,
        author: {
          name: data['author']['name'] as string,
          email: data['author']['email'] as string,
          github: data['author']['github'] as string,
          avatar: data['author']['avatar'] as string,
        },
      });
    });

    return resources;
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
  }
}

export async function getAllTags({ all }: { all: boolean }) {
  try {
    let querySnapshot: QuerySnapshot<DocumentData, DocumentData>;

    if (all === false) {
      const q = query(
        collection(db, TagStr),
        where('docId', '!=', [] || null || 0 || ''),
      );
      querySnapshot = await getDocs(q);
    } else {
      querySnapshot = await getDocs(collection(db, TagStr));
    }

    if (querySnapshot.empty) {
      return null;
    }

    const tags: string[] = [];

    querySnapshot.forEach((doc) => {
      tags.push(doc.id);
    });

    return tags;
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
  }
}
